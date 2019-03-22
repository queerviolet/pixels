import { Framebuffer } from 'luma.gl'
import { Cell, Seed } from './loop'
import { GLContext, Clock } from './contexts'

export default function Swapper(props: any = {}, cell?: Cell) {
  if (!cell) return Seed(Swapper, props)

  const gl = cell.read(GLContext); if (!gl) return
  cell.read(Clock)

  const offscreenA = cell.effect<Framebuffer>('framebuffer-A', _ => {
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    const framebuffer = new Framebuffer(gl, {
      id: 'framebuffer-A',
      width, height, depth: true,
    })
    framebuffer.checkStatus()
    framebuffer.clear({color: [0, 0, 0, 100], depth: 1, stencil: 0})
    _(framebuffer)
    return () => {
      framebuffer._deleteHandle()
    }
  }, [gl, gl.drawingBufferWidth, gl.drawingBufferHeight])

  const offscreenB = cell.effect<Framebuffer>('framebuffer-B', _ => {
    const width = gl.drawingBufferWidth
    const height = gl.drawingBufferHeight
    const framebuffer = new Framebuffer(gl, {
      id: 'framebuffer-B',
      width, height, depth: true,
    })
    framebuffer.checkStatus()
    framebuffer.clear({color: [0, 0, 0, 100], depth: 1, stencil: 0})
    _(framebuffer)
    return () => {
      framebuffer._deleteHandle()
    }
  }, [gl, gl.drawingBufferWidth, gl.drawingBufferHeight])

  const ticktock = cell.effect<{ tick: boolean }>('ticktock', _ => _({ tick: false }), [])
  ticktock.tick = !ticktock.tick;              
  const [src, dst] = ticktock.tick
    ? [offscreenA, offscreenB]
    : [offscreenB, offscreenA]

  return { src, dst }
}