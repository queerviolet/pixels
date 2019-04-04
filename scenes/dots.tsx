import { Cell, Seed } from '../loop'
import Points from '../points'
import ImageTexture from '../image-texture'

// @ts-ignore
import skyline from '../manila-skyline.jpg'

// @ts-ignore
import ashi from '../ashi-headshot-02.jpg'

export default {
  'Me made of dots': {
    draw: Dots(),
  },
  'Skyline': {
    draw: Dots({ src: skyline })
  }
}

function Dots(props: { src?: string, output?: any }={}, cell?: Cell) {
  if (!cell) return Seed(Dots, props)
  const uImage =  ImageTexture({ src: props.src || ashi })
  return cell.read(Points({
    node: 'skyline',
    uImage,
    output: props.output,
  }))
}
