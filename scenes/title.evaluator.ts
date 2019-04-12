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

import { Clock } from '../contexts'

export default function Title(props: { node?: string, color?: any, drawingHint?: boolean, output?: any }={}, cell?: Cell) {
  if (!cell) return Seed(Title, props)
  const {node='title', color} = props
  cell.read(RecordStroke({
    node,
    color
  }))
  
  if (!props.output) { cell.read(Clock); return }

  return cell.read(Layers([
    {
      output: DrawTexture({
        draw:
          Points({
            node,
            uApplyForce: BuildIn({ beat: 'title/force' }),
            uApplyColor: BuildIn({ beat: 'title/color' }),
            uApplyPosition: BuildIn({ beat: 'title/position', ms: 3000 }),
            uApplyOpacity: BuildIn({ beat: 'title/opacity' }),
          })
      }),
      opacity: (isTablet && props.drawingHint) ? 0.5 : 1.0,
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
