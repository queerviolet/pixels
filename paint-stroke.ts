import { Cone, Framebuffer } from 'luma.gl'
import { GLContext, Camera, Clock } from './contexts'
import { Cell, Seed, Pattern } from './loop'
import { QueueBuffer } from './buffers'

type PaintStrokeProps = {
  node: string
  batchSize?: number
  deltaColor?: boolean
}

interface StrokeCell extends Cell {
  lastPosition: Float32Array
}

export default function PaintStroke(props: PaintStrokeProps, cell?: StrokeCell) {  
  if (!cell) return Seed(PaintStroke, props)
  if (!props.node) return
  const gl = cell.read(GLContext); if (!gl) return 

  const { node, batchSize = 100 } = props

  const pos = cell.readChild(QueueBuffer({ data: node + '/pos.vec2' }))
  const force = cell.readChild(QueueBuffer({ data: node + '/force.float' }))
  const color = cell.readChild(QueueBuffer({ data: node + '/color.vec4' }))
  if (!pos || !force || !color) return

  const cone = cell.effect<Cone>('cones', _ => {                  
    _(new Cone(gl, {
      radius: 0.5,
      height: 0.1,
      cap: false,
      vs: `
        attribute vec3 positions;

        uniform vec2 uPos;
        uniform float uForce;
        uniform mat4 uProjection;
        varying vec4 vPosition;

        void main() {
          vec3 vertex = positions * uForce;
          vPosition = vec4(vertex.xz + uPos, -vertex.y - 0.5, 1.0);
          gl_Position = vec4((uProjection * vPosition).xy, vertex.y, 1.0);
        }`,
      fs: `
        uniform vec2 uPos;
        uniform vec4 uColor;
        precision highp float;
        varying vec4 vPosition;

        void main() {
          vec2 texPos = vec2((uPos.x + 16.) / 32., (uPos.y + 9.) / 18.);
          gl_FragColor = vec4(uColor.rgb, 0.0);
        }`,
    }))
    return cone => cone.delete()
  }, [ gl ])

  const uProjection = cell.read(Camera.uProjection)
  if (!uProjection) return

  return (framebuffer: Framebuffer) => {
    if (!cone || !pos || !force || !color) return
    let batch = Math.min(batchSize, pos.length, force.length, color.length)
    while (batch --> 0) {
      const uPos = pos.shift()
      const uForce = force.shift()
      let uColor = color.shift()
      
      if (props.deltaColor) {        
        if (!cell.lastPosition) {          
          cell.lastPosition = uPos
          continue
        }
        const [x0, y0] = cell.lastPosition
        const [x1, y1] = uPos
        cell.lastPosition = uPos
        uColor = Float32Array.from([x1 - x0, y1 - y0, 0, 0])
      }

      cone.draw({
        uniforms: {
          uProjection,
          uPos,
          uForce,
          uColor,
        },
        framebuffer
      })
    }
    if (pos.length || force.length || color.length) cell.read(Clock)
  }
}
