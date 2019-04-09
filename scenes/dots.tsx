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
import { isTablet } from '../view-mode'

import { Presentation, Clock } from '../contexts'
import { BuildIn } from '../anim'
import Layers from '../layers'
import DrawTexture from '../draw-texture'

let currentSampler: Sampler = () => [1, 1, 1, 1]
const color: Sampler = (x, y) => currentSampler(x, y)

const COLOR_PICKER = isTablet ? <Picker
  onPick={c => currentSampler = asSampler(c)}
  colors={[
    [1, 0, 1, 1],
    [0, 1, 1, 1],
    () => [Math.random(), Math.random(), Math.random(), 1.0],
  ]} /> : null

export default {
  [`I'm going to paint you something`]: {
    draw: Dots(),
    overlay: COLOR_PICKER
  },
  [`Render force`]: {
    draw: Dots({ applyForce: true }),
    overlay: COLOR_PICKER,
  },
  [`Position them on a cartesian plane`]: {
    draw: Dots({ applyForce: true, applyPosition: true }),
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
 
function Dots(props: { src?: string, output?: any, applyForce?: boolean, applyPosition?: boolean }={}, cell?: Cell) {
  if (!cell) return Seed(Dots, props)
  cell.read(RecordStroke({
    node: 'title',
    color
  }))
  
  // const uApplyPosition = applyPosition
  if (!props.output) return

  // if (isTablet) {
  //   cell.read(Points({
  //     node: 'title',
  //     output: props.output,      
  //     uApplyPosition: 1.0,
  //   }))
  // }

  return cell.read(Layers([
    {
      output: DrawTexture({
        draw:
          Points({
            node: 'title',
            uApplyForce: props.applyForce ? BuildIn({ name: 'force' }) : 0.0,
            uApplyPosition: props.applyPosition ? BuildIn({ name: 'pos' }) : 0.0,
          })
      }),
      opacity: isTablet ? 0.5 : 1.0,
    },
    isTablet && {
      output: DrawTexture({
        draw:
          Points({
            node: 'title',
            output: props.output,      
            uApplyPosition: 1.0,
            uApplyForce: 1.0,
          })
      }),
      opacity: 1.0
    },
    { destination: props.output }
  ]))
}
