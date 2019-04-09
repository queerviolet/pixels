import { POINTS } from 'luma.gl/constants'

import { Camera } from './contexts'
import { Cell, Seed, ReadObject } from './loop'
import Shader from './shader'
import { VertexArrayBuffer, IndexBuffer } from './buffers'

const basicVs = require('./points.basic.vert')
const basicFs = require('./points.basic.frag')

export interface Props {
  node: string
  drawMode?: number
  uImage?: any
  output?: any
  uApplyPosition?: number
  uApplyForce?: number
  uApplyColor?: number
}

export default function Points(props: Props, cell?: Cell) {
  if (!cell) return Seed(Points, props)
  const { node, drawMode=POINTS, } = props

  const shader = cell.read(Shader({
    vs: `
      uniform float uApplyPosition;
      uniform float uApplyForce;
      uniform float uApplyColor;

      attribute float index;
      
      ${basicVs}

      vec4 pos_from_index() {
        float i = index / 128.0;
        float f = floor(i);
        return uProjection * vec4(vec2(f / 2.0, 15.0 * (i - f)) - vec2(15.0, 8.0), 0.0, 1.0);
      }

      void main() {
        // gl_Position = uProjection * vec4(mix(pos_from_index(), pos, uApplyPosition), 0.0, 1.0);
        // gl_PointSize = mix(5.0, 5.0 * force * 7.0, uApplyForce);
        transform();
        gl_Position = mix(pos_from_index(), gl_Position, uApplyPosition);
        gl_PointSize = mix(5.0, gl_PointSize, uApplyForce);
        vColor = mix(vec4(pos.x, force, pos.y, 1.0), color, uApplyColor);
      }
    `,
    fs: basicFs
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

  const uniforms = cell.read(ReadObject({
    uProjection: Camera.uProjection,
    uApplyPosition: props.uApplyPosition || 0,
    uApplyForce: props.uApplyForce || 0,
    uApplyColor: props.uApplyColor || 0,   
  }))
  if (!uniforms) return 

  const params: any = {
    vertexArray: shader.vertexArray,
    vertexCount,
    drawMode,
    uniforms,    
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
