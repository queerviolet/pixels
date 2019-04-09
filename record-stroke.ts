import { Seed, Cell } from './loop'
import { vec2, vec4, float } from 'parcel-plugin-writable/src/struct'
import Data, { write } from './parcel-plugin-writable/src/node'
import { frameCoordsFrom } from './stage'
import { GLContext } from './contexts'

export type Sampler = (x: number, y: number) => number[]

type Props = {
  node?: string
  color?: Sampler
}

export default function RecordStroke(props: Props, cell?: Cell) {
  if (!cell) return Seed(RecordStroke, props)
  const { node } = props

  const gl = cell.read(GLContext)
  if (!gl) return
  const { canvas } = gl
  if (!canvas) return

  const srcColor = cell.read<Sampler>(props.color)

  return cell.effect('listen-and-write', () => {
    const pos = Data(node, ['pos'], vec2)
    const force = Data(node, ['force'], float)
    const color = Data(node, ['color'], vec4)
    color.set([1, 1, 1, 1])

    canvas.addEventListener('mousedown', onMouse)
    canvas.addEventListener('mousemove', onMouse)
    canvas.addEventListener('mouseup', onMouse)
    canvas.addEventListener('touchstart', onTouch)
    canvas.addEventListener('touchmove', onTouch)
    canvas.addEventListener('touchend', onTouch)

    function onTouch(t: TouchEvent) {
      const { touches } = t
      t.preventDefault()
      let i = touches.length; while (i --> 0) {
        const touch = touches.item(i)
        if (touch.touchType !== 'stylus') continue
        const coords = frameCoordsFrom(touch)
        pos.set(coords)
        force.set([touch.force])
        write(pos)
        write(force)

        if (srcColor) {
          color.set(srcColor(coords[0], coords[1]))
        }
        write(color)
      }
    }

    let isDrawing = false
    function onMouse(ev: MouseEvent) {
      if (ev.type === 'mousedown') isDrawing = true
      if (!isDrawing) return
      if (ev.type === 'mouseup') isDrawing = false
      const coords = frameCoordsFrom(ev)
      pos.set(coords)
      force.set([0.5])
      write(pos)
      write(force)

      if (srcColor) {
        color.set(srcColor(coords[0], coords[1]))
      }
      write(color)      
    }

    return () => {
      canvas.removeEventListener('mousemove', onMouse)
      canvas.removeEventListener('touchstart', onTouch)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchend', onTouch)
    }
  }, [node, canvas, srcColor])
}


