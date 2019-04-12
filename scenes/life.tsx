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
const randomColor = () => [Math.random(), Math.random(), Math.random(), 1.0]

let currentSampler: Sampler = asSampler(lighthouse)
let currentSrc: any = randomColor
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
        [1, 0, 1, 1],
        [0, 1, 1, 1],
        randomColor,
      ]} />
    <img src={src} className='hint' />
  </>
}

export default {
  lowrez_life: {
    draw: Stack({ node: 'game-of-life-stacked', octaves: [5], color }),
    overlay: <ImagePicker key='IMAGE_PICKER' />,
  },
  higher_life: {
    draw: Stack({ node: 'game-of-life-stacked', octaves: [3], color }),
    overlay: <ImagePicker key='IMAGE_PICKER' />,
  },
  stacked_life: {
    draw: Stack({ node: 'game-of-life-stacked', octaves: [0, 2, 3, 4], color }),
    overlay: <ImagePicker key='IMAGE_PICKER' />,
  },
  everything_comes_alive: {
    overlay: <div key='white' className='white' />,
    fadeMs: 3000,
  },
  sign_off: {
    draw: SignOff({ color }),
    overlay: <ImagePicker key='IMAGE_PICKER' />,
  },  
}

function SignOff(props?, cell?: Cell) {
  if (!cell) return Seed(SignOff, props)
  const { output } = props
  if (!output) return

  const paint = $Child(
    PaintStroke({
      node: 'title',
      batchSize: 80,
      deltaColor: props.deltaColor,
    })
  )
  paint && paint(output)

  const livingSig = DrawTexture({
    draw: Stack({ node: 'title', color })
  })

  $(
    Layers([
      { output: livingSig, opacity: 1 },
      { output: DrawTexture({
        draw:
          Points({
            node: 'title',
            uApplyForce: 1.0,
            uApplyColor: 1.0,
            uApplyPosition: 1.0,
            uApplyOpacity: 0,
            uScale: BuildIn({ beat: 'life/sign_off', ms: 3000, from: 10, to: 1, }),
          })
      }), opacity: 1.0 },
      { destination: output, additive: true }
    ])
  )
}

function Stack(props?, cell?: Cell) {
  if (!cell) return Seed(Stack, props)
  const { node, output, color, octaves=[0, 2, 3, 4] } = props
  if (!output) return
  
  $(RecordStroke({ node, color }))

  const layers = octaves.map(octave => ({
    output: Life({ node, color, octave }), opacity: 1.0
  }))

  const paint = $Child(
    PaintStroke({
      node,
      batchSize: 80,
      deltaColor: props.deltaColor,
    })
  )

  const bufs = []
  let ready = true
  let i = layers.length; while (i --> 0) {
    const l = $(layers[i].output)
    if (!l) { ready = false; continue }
    bufs.push(l.input)
    bufs.push(l.dst)
  }

  if (!ready) { cell.get('stack is not ready').write($(Clock)); return }

  paint && paint(...bufs)

  $(
    Layers([
      ...layers,
      { destination: output },
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

  return bleed
}


import { Cell, Seed, $, $Child, withProps } from '../loop'
import RecordStroke from '../record-stroke'
import Rumination from '../rumination'
import Shader from '../shader'
import PaintStroke from '../paint-stroke'
import Layers from '../layers'
import { GLContext, Clock } from '../contexts'
import DrawTexture from '../draw-texture'
import Points from '../points'
import { BuildIn } from '../anim'

