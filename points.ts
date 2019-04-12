import { POINTS } from 'luma.gl/constants'
import { withParameters } from 'luma.gl'

import { Camera, GLContext, Clock } from './contexts'
import { Cell, Seed, ReadObject } from './loop'
import Shader from './shader'
import { VertexArrayBuffer, IndexBuffer } from './buffers'

const basicVs = require('./points.withOpacity.vert')
const basicFs = require('./points.basic.frag')

export interface Props {
  node: string
  drawMode?: number
  uImage?: any
  output?: any
  uApplyPosition?: number
  uApplyForce?: number
  uApplyColor?: number
  uApplyOpacity?: number
  uScale?: number
}

export default function Points(props: Props, cell?: Cell) {
  if (!cell) return Seed(Points, props)
  const { node, drawMode=POINTS, } = props

  let output = null
  if (props.output) {
    output = cell.read(props.output)
    // params.framebuffer = output
    props.output.clear({color: [0, 0, 0, 0]})
  }

  const gl = cell.read(GLContext)
  if (!gl) return


  const shader = cell.read(Shader({
    vs: `
      uniform float uApplyPosition;
      uniform float uApplyForce;
      uniform float uApplyColor;
      uniform float uApplyOpacity;
      uniform float uScale;

      attribute float index;
      
      ${basicVs}

      vec4 pos_from_index() {
        float i = index / 32.0;
        float f = floor(i);
        return uProjection * vec4(vec2(f / 2.0, 16.0 * (i - f)) - vec2(15.0, 8.0), 0.0, 1.0);
      }

      void main() {
        // gl_Position = uProjection * vec4(mix(pos_from_index(), scaledPos, uApplyPosition), 0.0, 1.0);
        // gl_PointSize = mix(5.0, 5.0 * force * 7.0, uApplyForce);
        transform(uScale);
        gl_Position = mix(pos_from_index(), gl_Position, uApplyPosition);
        gl_PointSize = mix(20.0, gl_PointSize, uApplyForce);
        vColor = mix(vec4(pos.x, force, pos.y, 1.0), vColor, uApplyColor);
        vColor = mix(vec4(vColor.rgb, 1.0), vColor, uApplyOpacity);
      }
    `,
    fs: basicFs
  }))

  const pos = cell.read(VertexArrayBuffer({ data: `${node}/pos.vec2` }))
  const force = cell.read(VertexArrayBuffer({ data: `${node}/force.float` }))
  const color = cell.read(VertexArrayBuffer({ data: `${node}/color.vec4` }))

  if (!shader || !pos || !force || !color) return
  
  const vertexCount = pos.count
  if (!vertexCount) { cell.read(Clock); return }
  const index = cell.read(IndexBuffer({ for: VertexArrayBuffer({ data: `${node}/pos.vec2` }) }))
  if (!index ) { cell.read(Clock); return }

  shader.vertexArray.setAttributes({
    pos: pos.buffer,
    force: force.buffer,
    color: color.buffer,
    index: index.buffer,
  })

  const uProjection = cell.read(Camera.uProjection)
  if (!uProjection) { cell.read(Clock); return }

  const uniforms = cell.read(ReadObject({
    uProjection: Camera.uProjection,
    uApplyPosition: props.uApplyPosition || 0,
    uApplyForce: props.uApplyForce || 0,
    uApplyColor: props.uApplyColor || 0,
    uApplyOpacity: props.uApplyOpacity || 0,
    uScale: props.uScale || 1,
  }))
  if (!uniforms) return


  const params: any = {
    vertexArray: shader.vertexArray,
    vertexCount,
    drawMode,
    uniforms,
  }

  withParameters(gl, {
    [gl.BLEND]: true,
    blendFunc: [gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA],
    framebuffer: output
  }, () => shader.program.draw(params))

  return output && output.color
}
