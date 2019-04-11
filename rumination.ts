import { TRIANGLE_STRIP } from 'luma.gl/constants'

import { $, Cell, Seed, ReadObject } from './loop'

import { Shader } from './shader'
import { Swapper } from './framebuffer'
import { Stage, GLContext } from './contexts'

export interface Props {
  shader: Shader
  uniforms?: object
  opacity?: number
  width?: number
  height?: number
}

export default function Rumination(props: Props, cell?: Cell) {
  if (!cell) return Seed(Rumination, props)
  const gl = $(GLContext)
  if (!gl) return

  const { width=gl.drawingBufferWidth,
          height=gl.drawingBufferHeight } = props

  const framebuffers = cell.readChild(Swapper({ width, height }))
  const shader = cell.read(props.shader)
  const uniforms = cell.read(ReadObject(props.uniforms || {}))
  const aPosition = cell.read(Stage.aPosition)
  const vertexCount = cell.read(Stage.uCount)

  if (!framebuffers || !shader || !uniforms || !aPosition) return
  const { src, dst } = framebuffers
  if (!src || !dst) return

  uniforms.uInput = src.color

  shader.vertexArray.setAttributes({ aPosition })

  gl.viewport(0, 0, width, height);
  shader.program.draw({
    vertexArray: shader.vertexArray,
    vertexCount,
    drawMode: TRIANGLE_STRIP,
    framebuffer: dst,
    uniforms: {
      ...uniforms,
      uInput: src.color,
      uStep: Float32Array.from([1 / width, 1 / height]),
    }
  })

  return {
    input: src,
    output: dst.color,
    src,
    dst,
    opacity: props.opacity
  }
}