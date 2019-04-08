import { POINTS } from 'luma.gl/constants'

import { Camera } from './contexts'
import { Cell, Seed } from './loop'
import Shader from './shader'
import { VertexArrayBuffer } from './buffers'

export interface Props {
  node: string
  drawMode?: number
  uImage?: any
  output?: any
}

export default function Points(props: Props, cell?: Cell) {
  if (!cell) return Seed(Points, props)
  const { node, drawMode=POINTS, } = props

  const shader = cell.read(Shader({
    vs: `
      uniform mat4 uProjection;

      attribute vec2 pos;
      attribute float force;
      attribute vec4 color;

      varying float vForce;
      varying vec2 vPos;
      varying vec4 vColor;

      void main() {
        gl_Position = uProjection * vec4(pos.x, pos.y, 0.0, 1.0);
        gl_PointSize = 5.0 * force * 7.0;
        vForce = force;
        vPos = pos;
        vColor = color;
      }
    `,
    fs: `
      precision highp float;
      varying float vForce;
      // uniform sampler2D uImage;
      varying vec2 vPos;
      varying vec4 vColor;

      void main() {
        vec2 texCoord = vec2((vPos.x + 16.) / 32., (vPos.y + 9.) / 18.);
        // gl_FragColor = vec4(texture2D(uImage, texCoord).rgb, 1.0);
        gl_FragColor = vColor;
      }
    `
  }))

  const pos = cell.read(VertexArrayBuffer({ data: `${node}/pos.vec2` }))
  const force = cell.read(VertexArrayBuffer({ data: `${node}/force.float` }))
  const color = cell.read(VertexArrayBuffer({ data: `${node}/color.vec4` }))

  if (!shader || !pos || !force) return

  const vertexCount = pos.count
  if (!vertexCount) return

  shader.vertexArray.setAttributes({
    pos: pos.buffer,
    force: force.buffer,
    color: color.buffer,
  })

  const uProjection = cell.read(Camera.uProjection)
  if (!uProjection) return

  // const uImage = cell.read(props.uImage)
  // if (!uImage) return

  const params: any = {
    vertexArray: shader.vertexArray,
    vertexCount,
    drawMode,
    uniforms: {
      uProjection,
      // uImage,
    }
  }

  let output = null
  if (props.output) {
    output = cell.read(props.output)
    params.framebuffer = output
  }
  shader.program.draw(params)

  return output && output.color
}