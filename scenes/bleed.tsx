import * as React from 'react'
import { useState } from 'react'

import RecordStroke, { Sampler } from '../record-stroke'

import PaintStroke from '../paint-stroke'

// @ts-ignore
import skyline from '../manila-skyline.jpg'

const hills = require('../batanes-hills.jpg')
const lighthouse = require('../batanes-lighthouse.jpg')
const pier = require('../batanes-pier.jpg')

import { Cell, Seed } from '../loop'
import { hbox, STAGE } from '../stage'
import Code from '../code'
import Picker, { asSampler } from '../picker'
import isTablet from '../view-mode'

import Bleed from './bleed.evaluator'
import Inspector from '../inspector'

const fs = require('./bleed.frag')

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
      ]} />
    <img src={src} className='hint' />
  </>
}

export default {
  'Draw on the skyline': {
    draw: Paint(),
    overlay: <ImagePicker />
  },
  'Bleed them together': {
    draw: Bleed({ node: 'manila', color, fs }),
    overlay: <ImagePicker />
  },
  'Bleed fragment shader': {
    note: `Fragment shader`,
    draw: Bleed({ node: 'manila', color, fs }),
    overlay: [
      <ImagePicker />,
      <Code key='scenes/bleed.frag' src='scenes/bleed.frag' frame={hbox(STAGE, 2)[0]} />,
    ],
  },
  'Batanes': {
    note: `
      These are actually three separate photos. I'm just using this selector,
      which you can't see, to pick which image I'm sampling colors from.
      So I can create this kindof glitchy watercolor collage effect.
    `,
    draw: Bleed({ node: 'batanes-start', color, fs }),
    overlay: <ImagePicker imgs={[
      hills, lighthouse, pier
    ]} />, 
  },
  'Batanes out the oven': {
    note: `
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
    draw: Bleed({ node: 'batanes', color, fs }),
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
    draw: Bleed({ node: 'batanes', color, fs }),
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
    draw: Bleed({ node: 'batanes', color, fs }),
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
      
      In a spreadsheet, you have this setup where some of your cells contain
      raw values and other cells contain functions which can reference those
      values. If you change one cell, then all the cells that depend on that
      cell update. They don't necessarily update immediately. If you have a
      lot of complex functions, it may take a while for the sheet to become
      consistent again, but it will happen.
      
      That's basically what's going on here. Instead of indexing our cells by
      row and column, we index them by key. And we compute those keys based
      on the props and what we call the Evaluator for the cell.

      Like a React component, Evaluators take props and immediately return a
      value. And like React components, there's a little bit more to it than
      that.

      Let's look at the evaluator for the Bleed cell, which is drawing the
      scene we're looking at right now:
    `,
    draw: Bleed({ node: 'batanes', color, fs }),
    overlay: [
      <ImagePicker imgs={[
        hills, lighthouse, pier
      ]} />,
      <Inspector />
    ],
  },
  'Batanes with inspector and evaluator': {
    note: `
      Evaluators take props and a reference to the actual Cell they're evaluating.
      If you don't provide a cell, the Evaluator returns a Pattern, which is
      a lot like a virtual DOM element—it includes the props, and a reference to
      this function, and that's it.

      Unlike a component, this whole setup is designed to make it *super easy*
      to reference other cells by their patterns.

      So we use this $ function—pronounced "connect"—to connect another cell.
      It takes a Pattern and returns that Pattern's current value. Under the hood,
      it creates an edge between that cell and this one, so when that value changes,
      this evaluator will get called again.

      We connect up a few other cells. First a RecordStroke cell, which
      attaches event listeners to the canvas and sends the data to the server.

      And then we mount a Rumination, which is an Evaluator that handles the
      infinite recurisve buffer-swapping shader business, just looping back
      the shader's output to its input, forever.

      PaintStroke returns a function that reads from the node we're
      Recording to, and it draws sized dots for each input event. batchSize
      is how many points it'll draw per frame, so you can use that as kindof
      a crude way to change the speed that the painting redraws itself.

      And then finally we return this Layer stack, the main point of which
      is to composite our Rumination down into the output framebuffer
      we were given by the player.

      There's some real similarities between this and React. We do our own
      kind of diff: every time we re-evaluate a cell, we detach all its
      connections and allow the evaluator to reconnect the ones it's interested
      in, by calling the connect function. If a Cell ends up with no connections
      for more than a few ticks, we kill it, and free any resources associated
      with it.

      But unlike React components, Cells can wire themselves into a web of
      dependencies. React is explicitly opposed to this. You *can* get refs to
      other components, but basically the advice is that you *shouldn't*. React
      really  wants your data to flow one way: out of your components and into
      the page. Having data flowing every whichaway leads to chaos.

      But we want chaos. That's why these recursive shader effects are so cool:
      they are literally chaotic. They just keep looping back onto themsevles
      and changing.

      This one is pretty stable. Others, won't be.
    `,
    draw: Bleed({ node: 'batanes', color, fs }),
    overlay: [
      <ImagePicker imgs={[
        hills, lighthouse, pier
      ]} />,
      <Inspector />,
      <Code key='scenes/bleed.evaluator.ts' src='scenes/bleed.evaluator.ts' frame={hbox(STAGE, 2)[1]} />,
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