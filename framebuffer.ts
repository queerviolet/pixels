import { Framebuffer as LumaFramebuffer } from 'luma.gl'
import { Cell, Seed } from './loop'
import { GLContext, Clock } from './contexts'

export function Framebuffer(props: any = {}, cell?: Cell) {
  if (!cell) return Seed(Framebuffer, props)
  const gl = cell.read(GLContext); if (!gl) return
  return cell.effect<LumaFramebuffer>('the framebuffer', _ => {
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    const framebuffer = new LumaFramebuffer(gl, {
      id: cell.key,
      width, height, depth: true,
    })
    framebuffer.checkStatus()
    framebuffer.clear({color: [0, 0, 0, 100], depth: 1, stencil: 0})
    _(framebuffer)
    return () => {
      framebuffer._deleteHandle()
    }
  }, [gl, gl.drawingBufferWidth, gl.drawingBufferHeight])
}

export function Swapper(props: any = {}, cell?: Cell) {
  if (!cell) return Seed(Swapper, props)

  const gl = cell.read(GLContext); if (!gl) return
  cell.read(Clock)

  const offscreenA = cell.readChild(Framebuffer({ id: 'A' }))
  const offscreenB = cell.readChild(Framebuffer({ id: 'B' }))

  const ticktock = cell.effect<{ tick: boolean }>('ticktock', _ => _({ tick: false }), [])
  ticktock.tick = !ticktock.tick;              
  const [src, dst] = ticktock.tick
    ? [offscreenA, offscreenB]
    : [offscreenB, offscreenA]

  return { src, dst }
}