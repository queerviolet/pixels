import * as React from 'react'

import { Cell, Seed } from '../loop'
import Points from '../points'
import ImageTexture from '../image-texture'

// @ts-ignore
import skyline from '../manila-skyline.jpg'

// @ts-ignore
import ashi from '../ashi-headshot-02.jpg'
import { Panel } from '../panel'

export default {
  'Me made of dots': {
    draw: Dots(),
  },
  'Me made of dots with code': {
    draw: Dots(),
    overlay: <Panel file='./scenes/dots.tsx' />
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
