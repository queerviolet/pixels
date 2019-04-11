import * as React from 'react'
import { useState } from 'react'

import { Sampler } from '../record-stroke'

const hills = require('../batanes-hills.jpg')
const lighthouse = require('../batanes-lighthouse.jpg')
const pier = require('../batanes-pier.jpg')

import Picker, { asSampler } from '../picker'
import isTablet from '../view-mode'

import Bleed from './bleed.evaluator'

const life = require('./life.frag')

let currentSampler: Sampler = asSampler(lighthouse)
let currentSrc = lighthouse
const color: Sampler = (x, y) => currentSampler(x, y)

const ImagePicker = ({ imgs=[hills, lighthouse, pier] }) => {
  if (!isTablet) return null
  const [src, setSrc] = useState(currentSrc)
  return <>
    <Picker
      onPick={c => {
        currentSampler = asSampler(c)
        currentSrc = c
        setSrc(c)
      }}
      colors={[
        ...imgs,
        [1, 1, 1, 1],
        [0, 0, 0, 1],
        () => [Math.random(), Math.random(), Math.random(), 1.0],
      ]} />
    <img src={src} className='hint' />
  </>
}

export default {
  stacked_life: {
    draw: Stack({ node: 'game-of-life-stacked', color }),
    overlay: <ImagePicker key='IMAGE_PICKER' />,
  },
}

function Stack(props?, cell?: Cell) {
  if (!cell) return Seed(Stack, props)
  const { node, output, color } = props

  return $(
    Layers([
      { output: Life({ node, color }), opacity: 1.0 },
      { output: Life({ node, color, octave: 2 }), opacity: 1.0 },
      { output: Life({ node, color, octave: 3 }), opacity: 1.0 },
      { output: Life({ node, color, octave: 4 }), opacity: 1.0 },
      { destination: output }
    ])
  )
}

function Life(props?, cell?: Cell) { 
  if (!cell) return Seed(Life, props)
  const { node, color, octave=0 } = props

  const factor = 2 ** -octave;

  const gl = $(GLContext)
  if (!gl) return 
  const { drawingBufferWidth: w, drawingBufferHeight: h } = gl

  $(RecordStroke({ node, color }))
  const bleed = $Child(
    Rumination({
      uniforms: { uStep: 0.001, },
      width: Math.round(w * factor),
      height: Math.round(h * factor),
      shader: Shader({
        vs: require('../stage.vert'),
        fs: require('./life.frag'),
      })
    })
  )  
  if (!bleed) return

  const paint = $Child(
    PaintStroke({
      node,
      batchSize: 80,
      deltaColor: props.deltaColor,
    })
  )

  paint && paint(bleed.dst)

  return bleed
}


import { Cell, Seed, $, $Child } from '../loop'
import RecordStroke from '../record-stroke'
import Rumination from '../rumination'
import Shader from '../shader'
import PaintStroke from '../paint-stroke'
import Layers from '../layers'
import { GLContext } from '../contexts'

