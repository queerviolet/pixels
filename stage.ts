import { applyLetterbox, Box } from './letterbox'

const WIDTH = 16
const HEIGHT = 9
const X_MIN = -WIDTH
const Y_MIN = -HEIGHT
const X_MAX = WIDTH
const Y_MAX = HEIGHT

const MIN: StageCoordinates = [X_MIN, Y_MIN]
const MAX: StageCoordinates = [X_MAX, Y_MAX]
export const STAGE: StageRect = [MIN, MAX]

let frame: Box | null = null
applyLetterbox(WIDTH / HEIGHT, box => {
  frame = box
  document.body.style.setProperty('--su', frame.width / (WIDTH * 2) + 'px')
})

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

const widthOfRect = (r: StageRect) => r[1][0] - r[0][0]
const heightOfRect = (r: StageRect) => r[1][1] - r[0][1]

export const vbox = (container: StageRect, count=3, margin=0.3): StageRect[] => {
  const contentHeight = (heightOfRect(container) - margin * (count + 1)) / count
  const advance = contentHeight + margin
  return Array.from({length: count}, (_, i) => [
    [container[0][0] + margin, container[0][1] + i * advance + margin],
    [container[1][0] - margin, container[0][1] + (i + 1) * advance - margin],
  ]) as StageRect[]
}

export const hbox = (container: StageRect, count=3, margin=0.3): StageRect[] => {
  const contentHeight = (widthOfRect(container) - margin * (count + 1)) / count
  const advance = contentHeight + margin
  return Array.from({length: count}, (_, i) => [
    [container[0][0] + i * advance + margin, container[0][1] + margin],
    [container[0][0] + (i + 1) * advance - margin, container[1][1] - margin],
  ]) as StageRect[]
}

export const GRID_3x3 = hbox(STAGE).map(r => vbox(r))
