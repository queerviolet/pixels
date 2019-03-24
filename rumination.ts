import { TRIANGLE_STRIP } from 'luma.gl/constants'

import { Cell, Seed, ReadObject } from './loop'

import { Shader } from './shader'
import Swapper from './swapper'
import { Stage } from './contexts'

export interface Props {
  shader: Shader
  uniforms?: object
}

export default function Rumination(props: Props, cell?: Cell) {
  if (!cell) return Seed(Rumination, props)

  const framebuffers = cell.readChild(Swapper())
  const shader = cell.read(props.shader)
  const uniforms = cell.read(ReadObject(props.uniforms || {}))
  const aPosition = cell.read(Stage.aPosition)
  const vertexCount = cell.read(Stage.uCount)

  if (!framebuffers || !shader || !uniforms || !aPosition) return
  const { src, dst } = framebuffers

  uniforms.uInput = src.color

  shader.vertexArray.setAttributes({ aPosition })

  shader.program.draw({
    vertexArray: shader.vertexArray,
    vertexCount,
    drawMode: TRIANGLE_STRIP,
    framebuffer: dst,
    uniforms: {
      uInput: src.color,
      uStep: 0.001,
    }
  })

  return {
    input: src,
    output: dst.color,
    src,
    dst
  }
}