type Size = {width: number, height: number}
type Position = {top: number, left: number}
type Frame = Position & {bottom: number, right: number}
export type Box = Frame & Size
export type Letterbox = Box & { bars: Box[] }

export default letterbox

function letterbox(aspect: number, container: Size): Letterbox {
  const containerAspect = container.width / container.height
  if (containerAspect > aspect) {
    // Container is flatter than content, lock to container
    // height and letterbox on left and right
    const width = aspect * container.height
    const left = (container.width - width) / 2
    const height = container.height
    const top = 0
    return letterboxFrom(container, {
      top,
      left,
      width,
      height,
    })
  }
  // Container is taller than content, lock to container
  // width and letterbox on top and bottom
  const height = container.width / aspect
  const top = (container.height - height) / 2
  const width = container.width
  const left = 0
  return letterboxFrom(container, {top, left, width, height})
}

const letterboxFrom = (container: Size, box: Size & Position): Letterbox => ({
  ...boxFrom(container, box),
  bars: subtract(container, box),
})

const boxFrom = (container: Size, box: Size & Position): Box => ({
  ...box,
  bottom: container.height - (box.top + box.height),
  right: container.width - (box.left + box.width),
})

const subtract = (container: Size, box: Size & Position): Box[] => {
  if (!box.top) {
    const width = (container.width - box.width) / 2
    return [
      boxFrom(container, {
        top: 0,
        left: 0,
        width,        
        height: container.height
      }),
      boxFrom(container, {
        top: 0,
        left: container.width - width,
        width,
        height: container.height
      }),
    ]
  }
  const height = (container.height - box.height) / 2
  return [
    boxFrom(container, {
      top: 0, left: 0,
      width: container.width,
      height,
    }),
    boxFrom(container, {
      top: container.height - height,
      left: 0,
      width: container.width,
      height,
    })
  ]
}

const px = (px: number) => `${px}px`

export function applyLetterbox(aspect=16 / 9) {
  function onResize() {
    const box =
      letterbox(aspect, {width: innerWidth, height: innerHeight})
    setCSSPropertiesFrom(box)
  }
  window.addEventListener('resize', onResize)
  onResize()
  onDispose(() => window.removeEventListener('resize', onResize))
}

const setCSSPropertiesFrom = (src: any, prefix='--letterbox-', element=document.body) =>
  Object.keys(src).forEach(k =>
    typeof src[k] === 'object'
      ? setCSSPropertiesFrom(src[k], prefix + k + '-', element)
      :
    typeof src[k] === 'number'
      ? element.style.setProperty(prefix + k, px(src[k]))
      :
    element.style.setProperty(prefix + k, src[k])
  )

function onDispose(run) {
  ;(module as any).hot && (module as any).hot.dispose(run)
}