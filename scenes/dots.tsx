import * as React from 'react'

import { Cell, Seed } from '../loop'
import Points from '../points'
import ImageTexture from '../image-texture'

// @ts-ignore
import skyline from '../manila-skyline.jpg'

// @ts-ignore
import ashi from '../ashi-headshot-02.jpg'
import Code from '../code'
import { GRID_3x3 } from '../stage'
import RecordStroke, { Sampler } from '../record-stroke'
import Picker, { asSampler } from '../picker'

let sampleColor: Sampler = () => [1, 1, 1, 1]

const COLOR_PICKER = <Picker
  onPick={c => {
    console.log(c)
    sampleColor = asSampler(c)
  }}
  colors={[
    [1, 0, 1, 1],
    [0, 1, 1, 1],
    () => [Math.random(), Math.random(), Math.random(), 1.0],
  ]} />

export default {
  [`I'm going to paint you something`]: {
    draw: Dots(),
    overlay: COLOR_PICKER
  },
  'Me made of dots': {
    draw: Dots(),
  },
  'Me made of dots with code': {
    draw: Dots(),
    overlay: <>
      <Code src='./scenes/dots.tsx' frame={GRID_3x3[0][0]} />
    </>
  },
  'Even more code': {
    draw: Dots(),
    overlay: <>
      <Code src='./scenes/dots.tsx' frame={GRID_3x3[0][0]} />
      <Code src='./scenes/dots.tsx' frame={GRID_3x3[0][1]} />
      <Code src='./scenes/bleed.tsx' frame={GRID_3x3[0][2]} />
    </>
  },
  'Skyline': {
    draw: Dots({ src: skyline })
  }
}

function Dots(props: { src?: string, output?: any }={}, cell?: Cell) {
  if (!cell) return Seed(Dots, props)
  const uImage = ImageTexture({ src: props.src || ashi })
  cell.read(RecordStroke({
    node: 'title',
    color: (x, y) => sampleColor(x, y)
  }))
  
  return cell.read(Points({
    node: 'title',
    output: props.output,
  }))
}
