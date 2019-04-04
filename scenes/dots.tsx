import * as React from 'react'

import { Cell, Seed } from '../loop'
import Points from '../points'
import ImageTexture from '../image-texture'

// @ts-ignore
import skyline from '../manila-skyline.jpg'

// @ts-ignore
import ashi from '../ashi-headshot-02.jpg'
import { Panel } from '../panel'
import { GRID_3x3 } from '../stage'

export default {
  'Me made of dots': {
    draw: Dots(),
  },
  'Me made of dots with code': {
    draw: Dots(),
    overlay: <>
      <Panel key='k1' file='./scenes/dots.tsx' frame={GRID_3x3[0][0]} />
    </>
  },
  'Even more code': {
    draw: Dots(),
    overlay: <>
      <Panel key='k1' file='./scenes/dots.tsx' frame={GRID_3x3[0][0]} />
      <Panel key='k2' file='./scenes/dots.tsx' frame={GRID_3x3[0][1]} />
      <Panel key='k3' file='./scenes/bleed.tsx' frame={GRID_3x3[0][2]} />
    </>
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
