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

const hills = require('../batanes-hills.jpg')
const lighthouse = require('../batanes-lighthouse.jpg')
const pier = require('../batanes-pier.jpg')

import { $, $Child, Cell, Seed } from '../loop'
import { GRID_3x3, hbox, STAGE } from '../stage'
import Code from '../code'
import Picker, { asSampler } from '../picker'
import isTablet from '../view-mode'

import Bleed from './bleed.evaluator'
import Inspector from '../inspector'

let currentSampler: Sampler = asSampler(skyline)
let currentSrc = skyline
const color: Sampler = (x, y) => currentSampler(x, y)

const ImagePicker = ({ imgs=[skyline] }) => {
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
    draw: Bleed({ node: 'manila', color }),
    overlay: <ImagePicker />
  },
  'Bleed fragment shader': {
    draw: Bleed({ node: 'manila', color }),
    overlay: [
      <ImagePicker />,
      <Code key='scenes/bleed.frag' src='scenes/bleed.frag' frame={hbox(STAGE, 2)[0]} />,
    ],
    note: `This is Batanes...`
  },
  'Batanes': {
    note: `
      These are actually three separate photos. I'm just using this selector,
      which you can't see, to pick which image I'm sampling colors from.
      So I can create this kindof glitchy watercolor collage effect.

      We've seen the shader code driving this, which is basically the brain
      behind this whole thing.
      
      But like your parents and a number of world leaders, there's a lot
      I'm not telling you.
      
      There's a whole bunch of machinery back here
      setting up the graphics context and buffers and updating what needs to
      be updated over there (*gesture to screen*) when I draw on here
      (*scribble on tablet*). But then not re-drawing *everything*, because
      that would get a bit slow, especially if I keep putting down points.

      This would be a great moment to say, "And it's all in React!"

      But it's not. I mean, it *is*, in a sense...
    `,
    draw: Bleed({ node: 'batanes', color }),
    overlay: <ImagePicker imgs={[
      hills, lighthouse, pier
    ]} />,  
  },
  'The entrypoint': {
    note: `
      Here's the entrypoint, and yep, there is indeeda call to React DOM render.

      But there's this Loop component that seems important but is a bit of a
      mystery, and there's dollar signs going on, which are always a bit suspicious.

      And overall I think this raises more questions than answers.

      React is responsible for drawing all these windows and managing the state
      transitions between slides. But for managing the WebGL objects, I wanted
      to do something different.
      
      And that's because the requirements are a bit different.

      React is really good at reconciling tree strucutres. You say, "here's
      how I want the tree to look," and it goes and makes it look that way.

      That involves performing a diff, of course, and that diff is pretty
      fast, but still somewhat costly.

      In my experience, React does not work that well if you ask it to
      reconcile on every frame. And I've tried this several times. I'll build
      some animated thing, and be like, "I know! I should use React for this!".

      And then the time will come to animate a component, and I'll say,
      "I know! I'll just do something this..."
    `,
    draw: Bleed({ node: 'batanes', color }),
    overlay: [
      <ImagePicker imgs={[
        hills, lighthouse, pier
      ]} />,
      <Code key='index.tsx'
        src='index.tsx' scrollTo={55} highlight={[54, 58]} frame={hbox(STAGE, 2)[0]} />,
    ]
  },
  'The bad idea': {
    note: `
      And it *looks* fine, right? Looks like a reasonable enough way to animate
      things. And it even *is*, for a while... until it isn't. Every time I've
      done something like this, at some point, I end up in this state where I've got
      waaaaay too many frame callbacks and too many diffs happening and it all has
      to happen in 16ms, and it's just... too much. Things get janky.

      I want to be clear: There's *so much* React is great it. Tight RAF animations
      don't seem to be amongst them.

      So my rule is: Don't React on every frame. React about once per second.
      
      And this is a slightly nerve-wracking audience to say this to because I know
      there's someone out there thinking, "Bah! Of course it can work!". And I
      don't doubt it! I'm sure you're smart enough to make it work. I'm about
      equally sure that I am not.

      So, if we're not doing the core rendering in React, what are we using?

      We're using a spreadsheet.
    `,
    draw: Bleed({ node: 'batanes', color }),
    overlay: [
      <ImagePicker imgs={[
        hills, lighthouse, pier
      ]} />,
      <Code key='index.tsx' src='index.tsx' scrollTo={55} highlight={[54, 58]} frame={hbox(STAGE, 2)[0]} />,
      <Code key='bad-idea.tsx' src='bad-idea.tsx' frame={[[-8, -4], [8, 4]]} />,
    ]
  },
  'Batanes with inspector': {
    note: `
      Kindof. 
    `,
    draw: Bleed({ node: 'batanes', color }),
    overlay: [
      <ImagePicker imgs={[
        hills, lighthouse, pier
      ]} />,
      <Inspector />
    ],
  },
  'Batanes with inspector and evaluator': {
    draw: Bleed({ node: 'batanes', color }),
    overlay: [
      <ImagePicker imgs={[
        hills, lighthouse, pier
      ]} />,
      <Inspector />,
      <Code src='scenes/bleed.evaluator.ts' frame={hbox(STAGE, 2)[1]} />,
    ]
  },
}

function Paint(props?, cell?: Cell) {
  if (!cell) return Seed(Paint, props)
  const { node='manila' } = props
  cell.read(RecordStroke({ node, color }))
  const paint = cell.read(PaintStroke({
    node,
    batchSize: 100,
  } as any))

  paint && paint(props.output)
}