import { Seed, Cell } from './loop'
import { vec2, float } from 'parcel-plugin-writable/src/struct'
import Data, { write } from './parcel-plugin-writable/src/node'
import { frameCoordsFrom } from './stage'

type WithNode = { node?: string }

export default function RecordStroke(props: WithNode, cell?: Cell) {
  if (!cell) return Seed(RecordStroke, props)
  const { node } = props
  return cell.effect('listen-and-write', () => {
    const pos = Data(node, ['pos'], vec2)
    const force = Data(node, ['force'], float)

    const canvas = document.createElement('div')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.position = 'fixed'
    canvas.style.zIndex = '100'
    document.body.appendChild(canvas)

    canvas.addEventListener('mousemove', onMouseMove)
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

    function onMouseMove(ev: MouseEvent) {  
      pos.set(frameCoordsFrom(ev) as any)
      force.set([0.5])
      write(pos)
      write(force)
    }

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchstart', onTouch)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchend', onTouch)
      document.body.removeChild(canvas)
    }
  }, [node])
}

