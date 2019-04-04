import { applyLetterbox, Box } from './letterbox'

const WIDTH = 16
const HEIGHT = 9
const X_MIN = -WIDTH
const Y_MIN = -HEIGHT
const X_MAX = WIDTH
const Y_MAX = HEIGHT

const MIN = [X_MIN, Y_MIN]
const MAX = [X_MAX, Y_MAX]

let frame: Box | null = null
applyLetterbox(WIDTH / HEIGHT, box => frame = box)

export const STAGE_QUAD = [
  X_MAX, Y_MAX, 0,
  X_MIN, Y_MAX, 0,
  X_MAX, Y_MIN, 0,
  X_MIN, Y_MIN, 0
]

export const frameCoordsFrom = ({
  clientX, clientY,
}) =>
  [
    2 * WIDTH * (clientX - frame.left) / frame.width - WIDTH,
    2 * HEIGHT * (clientY - frame.top) / frame.height - HEIGHT,
  ]

export type StageCoordinates = [number, number]

export function toPosition([x, y]: StageCoordinates) {
  const tx = (x - X_MIN) / (2 * WIDTH)
  const ty = (y - Y_MIN) / (2 * HEIGHT)
  return {
    tx, ty,
    top: frame.top + frame.height * ty,
    left: frame.left + frame.width * tx,
    bottom: frame.bottom + frame.height * (1 - ty),
    right: frame.right + frame.width * (1 - tx),
  }
}

export type StageRect = [StageCoordinates, StageCoordinates]

export function pixelRect([p0, p1]: StageRect) {
  const pos0 = toPosition(p0)
  const pos1 = toPosition(p1)
  const { top, left } = pos0
  const { bottom, right } = pos1
  const width = pos1.left - left
  const height = pos1.top - top
  return {
    top, bottom, left, right, width, height
  }
}

export function vbox() {}