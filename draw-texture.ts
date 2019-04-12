import { POINTS } from 'luma.gl/constants'

import { Camera } from './contexts'
import { Cell, Seed } from './loop'
import Shader from './shader'
import { VertexArrayBuffer } from './buffers'
import { Framebuffer } from './framebuffer'

export interface Props {
  draw: any
}

export default function DrawTexture(props: Props, cell?: Cell) {
  if (!cell) return Seed(DrawTexture, props)
  const output = cell.readChild(Framebuffer())
  if (!output) return
  props.draw && cell.read(props.draw.withProps({ output }))
  return output
}