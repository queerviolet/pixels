import { Seed, Cell } from './loop'
import { vec2, float } from 'parcel-plugin-writable/src/struct'
import Data, { write } from './parcel-plugin-writable/src/node'
import { frameCoordsFrom } from './stage'
import { GLContext } from './contexts'

type WithNode = { node?: string }

export default function RecordStroke(props: WithNode, cell?: Cell) {
  if (!cell) return Seed(RecordStroke, props)
  const { node } = props

  const gl = cell.read(GLContext)
  if (!gl) return
  const { canvas } = gl
  if (!canvas) return
  console.log('canvas=', canvas)

  return cell.effect('listen-and-write', () => {    
    const pos = Data(node, ['pos'], vec2)
    const force = Data(node, ['force'], float)

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
        pos.set(frameCoordsFrom(touch))
        force.set([touch.force])
        write(pos)
        write(force)
      }
    }

    let isDrawing = false
    function onMouse(ev: MouseEvent) {
      if (ev.type === 'mousedown') isDrawing = true
      if (!isDrawing) return
      if (ev.type === 'mouseup') isDrawing = false
      pos.set(frameCoordsFrom(ev) as any)
      force.set([0.5])
      write(pos)
      write(force)
    }

    return () => {
      canvas.removeEventListener('mousemove', onMouse)
      canvas.removeEventListener('touchstart', onTouch)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchend', onTouch)
    }
  }, [node, canvas])
}


