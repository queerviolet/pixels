import * as React from 'react'
import { useState } from 'react'

import RecordStroke, { Sampler } from '../record-stroke'

import ImageTexture from '../image-texture'
import PaintStroke from '../paint-stroke'
import Layers from '../layers'
import Rumination from '../rumination'
import Shader from '../shader'

// @ts-ignore
import skyline from '../manila-skyline.jpg'
import { Cell, Seed } from '../loop'
import { GRID_3x3, hbox, STAGE } from '../stage'
import Code from '../code'
import Picker, { asSampler } from '../picker'
import isTablet from '../view-mode'

let currentSampler: Sampler = asSampler(skyline)
let currentSrc = skyline
const color: Sampler = (x, y) => currentSampler(x, y)

const ImagePicker = () => {
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
        skyline,
        [1, 1, 1, 1],
        [0, 0, 0, 1],
        () => [Math.random(), Math.random(), Math.random(), 1.0],
      ]} /> : null
    <img src={src} className='hint' />
  </>
}


export default {
  'Draw on the skyline': {
    draw: Paint(),
    overlay: <ImagePicker />
  },
  'Bleed them together': {
    draw: Bleed(),
    overlay: <ImagePicker />
  },
  'Bleed fragment shader': {
    draw: Bleed(),
    overlay: <>
      <ImagePicker />
      <Code src='scenes/bleed.frag' frame={hbox(STAGE, 2)[0]} />
    </>
  },
}

function Paint(props?, cell?: Cell) {
  if (!cell) return Seed(Paint, {})
  cell.read(RecordStroke({ node: 'manila', color }))
  cell.read(PaintStroke({
    node: 'manila',
    framebuffer: props.output,
    batchSize: 100,
  } as any))
}

function Bleed(props?, cell?: Cell) { 
  if (!cell) return Seed(Bleed, props)
  const { output } = props

  cell.read(RecordStroke({ node: 'manila', color }))

  const bleed = cell.read(BLEED)

  if (!bleed) return

  cell.read(PaintStroke({
    node: 'manila',
    framebuffer: bleed.input,
    batchSize: 20,
  } as any))

  cell.read(Layers([
    { output: bleed, opacity: 1.0 },
    { destination: output }
  ]))
}

const BLEED = Rumination({
  uniforms: {
    uStep: 0.001,
  },
  shader: Shader({
    vs: `
      attribute vec3 aPosition;
      varying vec3 vPosition;

      void main() {
        vPosition = (aPosition + vec3(1.0, 1.0, 0.0)) / 2.0;
        gl_Position = vec4(aPosition, 1.0);
      }
    `,
    fs: require('./bleed.frag'),
  })
})