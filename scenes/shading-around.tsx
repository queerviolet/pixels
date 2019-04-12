import * as React from 'react'
import { useState } from 'react'

import { Sampler } from '../record-stroke'

const hills = require('../batanes-hills.jpg')
const lighthouse = require('../batanes-lighthouse.jpg')
const pier = require('../batanes-pier.jpg')

import { Cell, Seed } from '../loop'
import { hbox, STAGE } from '../stage'
import Code from '../code'
import Picker, { asSampler } from '../picker'
import isTablet from '../view-mode'

import Bleed from './bleed.evaluator'

const blur = require('./blur.frag')
const afterimage = require('./afterimage.frag')
const illuminate = require('./illuminate.frag')
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

const withCode = (shader: { [name: string]: string }, node='batanes', props={}) => {
  const [[name, fs]] = Object.entries(shader)
  const src = `scenes/${name}.frag`
  return {
    [name]: {
      draw: Bleed({ node, color, fs, ...props }),
      overlay: <ImagePicker key='IMAGE_PICKER' />,
    },
    [`${name} code`]: {
      draw: Bleed({ node, color, fs, ...props }),
      overlay: [
        <ImagePicker key='IMAGE_PICKER' />,
        <Code key={src} src={src} frame={hbox(STAGE)[0]} />,
      ]
    },
  }
}

export default {
  ...withCode({blur}),
  ...withCode({afterimage}),  
  ...withCode({illuminate}),
  ...withCode({life}, 'game-of-life'),
}
