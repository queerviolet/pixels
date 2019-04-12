import * as React from 'react'

import { Cell, Seed } from '../loop'
import Points from '../points'
import ImageTexture from '../image-texture'

// @ts-ignore
import skyline from '../manila-skyline.jpg'

// @ts-ignore
import ashi from '../ashi-headshot-02.jpg'
import Code from '../code'
import { GRID_3x3, GRID_2x2, hbox, STAGE } from '../stage'
import RecordStroke, { Sampler } from '../record-stroke'
import Picker, { asSampler } from '../picker'
import { isTablet } from '../view-mode'

import { BuildIn } from '../anim'
import Layers from '../layers'
import DrawTexture from '../draw-texture'

import Title from './title.evaluator'

let currentSampler: Sampler = () => [1, 1, 1, 1]
const color: Sampler = (x, y) => currentSampler(x, y)

const COLOR_PICKER = isTablet ? <Picker
  key='COLOR_PICKER'
  onPick={c => currentSampler = asSampler(c)}
  colors={[
    [1, 1, 1, 1],
    [0, 0, 0, 1],
    [1, 0, 1, 1],
    [0, 1, 1, 1],
    () => [Math.random(), Math.random(), Math.random(), 1.0],
  ]} /> : null

export default {
  [`I'm going to paint you something`]: {
    draw: Title({ drawingHint: true, color }),
    overlay: COLOR_PICKER,
    note: `
      I'm going to draw you something.

      * ...draw, draw, draw... *
      * look at screen *

      Oh yeah, looks great.

      * ...draw, draw, draw... *
    `
  },
  force: {
    draw: Title({ drawingHint: true, color }),
    overlay: COLOR_PICKER,
  },
  position: {
    draw: Title({ drawingHint: true, color }),
    overlay: COLOR_PICKER,
  },
  color: {
    draw: Title({ drawingHint: true, color }),
    overlay: COLOR_PICKER,
  },
  [`vertex shader`]: {
    draw: Title({ drawingHint: true, color }),
    overlay: [
      COLOR_PICKER,
      <Code key='points.basic.vert' src='points.basic.vert' frame={GRID_2x2[0][0]} />,
    ]
  },
  [`fragment shader`]: {
    draw: Title({ drawingHint: true, color }),
    overlay: [
      COLOR_PICKER,
      <Code key='points.basic.vert' src='points.basic.vert' frame={GRID_2x2[0][0]} />,
      <Code key='points.basic.frag' src='points.basic.frag' frame={GRID_2x2[0][1]} />,
    ]
  },
  'litebrite mode': {
    draw: Title({ node: 'litebrite', color }),
    overlay: COLOR_PICKER,  
  },
  opacity: {
    draw: Title({ node: 'litebrite', color }),
    overlay: COLOR_PICKER,
  },
  'opacity with code': {
    draw: Title({ node: 'litebrite', color }),
    overlay: [
      COLOR_PICKER,
      <Code key='points.withOpacity.vert' src='points.withOpacity.vert' frame={GRID_2x2[0][0]} />,
    ]
  }
}
 