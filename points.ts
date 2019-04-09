import { POINTS } from 'luma.gl/constants'

import { Camera } from './contexts'
import { Cell, Seed } from './loop'
import Shader from './shader'
import { VertexArrayBuffer, IndexBuffer } from './buffers'

export interface Props {
  node: string
  drawMode?: number
  uImage?: any
  output?: any
  uGridToPos?: number
  uOpacity?: number
}

export default function Points(props: Props, cell?: Cell) {
  if (!cell) return Seed(Points, props)
  const { node, drawMode=POINTS, } = props

  const shader = cell.read(Shader({
    vs: `
      uniform mat4 uProjection;

      uniform float uGridToPos;

      attribute vec2 pos;
      attribute float force;
      attribute vec4 color;
      attribute float index;

      varying float vForce;
      varying vec2 vPos;
      varying vec4 vColor;
      
      vec2 pos_from_index() {
        float i = index / 128.0;
        float f = floor(i);
        return vec2(f / 2.0, 15.0 * (i - f)) - vec2(15.0, 8.0);
      }

      void main() {
        // gl_Position = uProjection * vec4(pos.x, pos.y, 0.0, 1.0);
        gl_Position = uProjection * vec4(mix(pos_from_index(), pos, uGridToPos), 0.0, 1.0);
        gl_PointSize = 5.0 * force * 7.0;
        // gl_PointSize = 5.0;
        vForce = force;
        vPos = pos;
        vColor = color;
      }
    `,
    fs: `
      precision highp float;

      uniform float uOpacity;

      varying float vForce;
      varying vec2 vPos;
      varying vec4 vColor;

      void main() {
        gl_FragColor = vec4(vColor.rgb, uOpacity);
      }
    `
  }))

  const pos = cell.read(VertexArrayBuffer({ data: `${node}/pos.vec2` }))
  const force = cell.read(VertexArrayBuffer({ data: `${node}/force.float` }))
  const color = cell.read(VertexArrayBuffer({ data: `${node}/color.vec4` }))

  if (!shader || !pos || !force || !color) return

  const vertexCount = pos.count
  const index = cell.read(IndexBuffer({ for: VertexArrayBuffer({ data: `${node}/pos.vec2` }) }))
  if (!index || !vertexCount) return

  shader.vertexArray.setAttributes({
    pos: pos.buffer,
    force: force.buffer,
    color: color.buffer,
    index: index.buffer,
  })

  const uProjection = cell.read(Camera.uProjection)
  if (!uProjection) return

  const uGridToPos = cell.read(props.uGridToPos || 0)
  const uOpacity = cell.read(props.uOpacity || 1)
  if (typeof uGridToPos !== 'number' || typeof uOpacity !== 'number')
    return

  const params: any = {
    vertexArray: shader.vertexArray,
    vertexCount,
    drawMode,
    uniforms: {
      uProjection,
      uGridToPos,
      uOpacity,
    }
  }

  let output = null
  if (props.output) {
    output = cell.read(props.output)
    params.framebuffer = output
    props.output.clear({color: [0, 0, 0, 0]})
  }
  shader.program.draw(params)

  return output && output.color
}