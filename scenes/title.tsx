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

let currentSampler: Sampler = () => [1, 1, 1, 1]
const color: Sampler = (x, y) => currentSampler(x, y)

const COLOR_PICKER = isTablet ? <Picker
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
    draw: Title({ drawingHint: true }),
    overlay: COLOR_PICKER
  },
  force: {
    draw: Title({ drawingHint: true }),
    overlay: COLOR_PICKER,
  },
  position: {
    draw: Title({ drawingHint: true }),
    overlay: COLOR_PICKER,
  },
  color: {
    draw: Title({ drawingHint: true }),
    overlay: COLOR_PICKER,
  },
  [`vertex shader`]: {
    draw: Title({ drawingHint: true }),
    overlay: <>
      {COLOR_PICKER}
      <Code src='points.basic.vert' frame={GRID_2x2[0][0]} />
    </>
  },
  [`fragment shader`]: {
    draw: Title({ drawingHint: true }),
    overlay: <>
      {COLOR_PICKER}
      <Code src='points.basic.vert' frame={GRID_2x2[0][0]} />
      <Code src='points.basic.frag' frame={GRID_2x2[0][1]} />
    </>
  },
  'litebrite mode': {
    draw: Title({ node: 'litebrite' }),
    overlay: COLOR_PICKER,  
  },
  opacity: {
    draw: Title({ node: 'litebrite' }),
    overlay: COLOR_PICKER,
  },
  'opacity with code': {
    draw: Title({ node: 'litebrite' }),
    overlay: <>
      {COLOR_PICKER}
      <Code src='points.withOpacity.vert' frame={GRID_2x2[0][0]} />
    </>
  }
}
 
function Title(props: { node?: string, drawingHint?: boolean, output?: any }={}, cell?: Cell) {
  if (!cell) return Seed(Title, props)
  const {node='title'} = props
  cell.read(RecordStroke({
    node,
    color
  }))
  
  if (!props.output) return

  return cell.read(Layers([
    {
      output: DrawTexture({
        draw:
          Points({
            node,
            uApplyForce: BuildIn({ beat: 'title/force' }),
            uApplyColor: BuildIn({ beat: 'title/position' }),
            uApplyPosition: BuildIn({ beat: 'title/color', ms: 3000 }),
            uApplyOpacity: BuildIn({ beat: 'title/opacity' }),
          })
      }),
      opacity: isTablet ? 0.5 : 1.0,
    },
    isTablet && props.drawingHint && {
      output: DrawTexture({
        draw:
          Points({
            node,
            output: props.output,      
            uApplyPosition: 1.0,
            uApplyForce: 1.0,
            uApplyColor: 1.0,
          })
      }),
      opacity: 1.0
    },
    { destination: props.output }
  ]))
}
