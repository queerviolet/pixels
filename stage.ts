import { applyLetterbox, Box } from './letterbox'

const WIDTH = 16
const HEIGHT = 9

let frame: Box | null = null
applyLetterbox(WIDTH / HEIGHT, box => frame = box)

export const STAGE_QUAD = [
  WIDTH, HEIGHT, 0,
  -WIDTH, HEIGHT, 0,
  WIDTH, -HEIGHT, 0,
  -WIDTH, -HEIGHT, 0
]

export const frameCoordsFrom = ({
  clientX, clientY,
}) =>
  [
    2 * WIDTH * (clientX - frame.left) / frame.width - WIDTH,
    2 * HEIGHT * (clientY - frame.top) / frame.height - HEIGHT,
  ]
