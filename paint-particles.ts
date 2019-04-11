import { Cone, Framebuffer, withParameters } from 'luma.gl'
import { GLContext, Camera, Clock } from './contexts'
import { $, Cell, Seed, Pattern } from './loop'
import { QueueBuffer, IndexBuffer } from './buffers'
import Shader from './shader'
import { Stream } from './stream'

type Props = {
  node: string
  batchSize?: number
}

interface ParticleCell extends Cell {
  writeIndex?: number
  lastPosition: Float32Array
}

export default function PaintParticles(props: Props, cell?: ParticleCell) {  
  if (!cell) return Seed(PaintParticles, props)
  if (!props.node) return
  const gl = cell.read<WebGLRenderingContext>(GLContext); if (!gl) return 

  const { node, batchSize=100 } = props

  const pos = cell.readChild(QueueBuffer({ data: node + '/pos.vec2' }))
  const force = cell.readChild(QueueBuffer({ data: node + '/force.float' }))
  const color = cell.readChild(QueueBuffer({ data: node + '/color.vec4' }))
  if (!pos || !force || !color) return

  const uProjection = cell.read(Camera.uProjection)
  if (!uProjection) return

  const shader = $(
    Shader({
      fs: require('./points.basic.frag'),
      vs: `
        uniform mat4 uProjection;
        uniform vec2 uPos;
        uniform float uForce;
        uniform vec4 uColor;
        
        varying vec4 vColor;
        
        void main() {
          gl_Position = vec4(uPos, 0.0, 1.0);
          gl_PointSize = 1.0;
          vColor = uColor;
        }
      `
    })
  )

  return (framebuffer: Framebuffer) => {    
    if (!shader || !pos || !force || !color) return
    let batch = Math.min(batchSize, pos.length, force.length, color.length)
    cell.writeIndex = cell.writeIndex || 0

    while (batch --> 0) {
      const uPos = pos.shift()
      const uForce = force.shift()
      let uColor = color.shift()
      if (!cell.lastPosition) {          
        cell.lastPosition = uPos
        continue
      }
      const [x0, y0] = cell.lastPosition
      const [x1, y1] = uPos
      cell.lastPosition = uPos
      uColor = Float32Array.from([...uPos, x1 - x0, y1 - y0].map(Math.abs).map(x => x / 4))

      const dx = 2 / framebuffer.width
      const dy = 2 / framebuffer.height

      const x = -1 + (cell.writeIndex % framebuffer.width) * dx
      const y = -1 + (cell.writeIndex / framebuffer.width) * dy

      const index = cell.read(IndexBuffer({ for: { count: 1 } as Stream }))
      if (!index) return
    
      shader.vertexArray.setAttributes({
        index: index.buffer,
      })
    
      // console.log('drawing', cell.writeIndex, [x, y], uColor)
      withParameters(gl, {
        [gl.BLEND]: false,
        framebuffer
      }, () => {
        gl.viewport(0, 0, framebuffer.width, framebuffer.height)
        
        shader.program.draw({
          vertexArray: shader.vertexArray,
          vertexCount: 1,
          drawMode: gl.POINTS,
          uniforms: {
            uProjection,
            uPos: Float32Array.from([x, y]),
            uForce,
            uColor,
          },
        })
      })

      ++cell.writeIndex;
      if (cell.writeIndex === framebuffer.width * framebuffer.height)
        cell.writeIndex = 0
    }
    if (pos.length || force.length || color.length) cell.read(Clock)
  }
}
