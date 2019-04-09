import * as React from 'react'

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
const color: Sampler = (x, y) => currentSampler(x, y)

const IMAGE_PICKER = isTablet ? <Picker
  onPick={c => currentSampler = asSampler(c)}
  colors={[
    skyline,
    [1, 1, 1, 1],
    [0, 0, 0, 1],
    () => [Math.random(), Math.random(), Math.random(), 1.0],
  ]} /> : null

export default {
  'Draw on the skyline': {
    overlay: IMAGE_PICKER,
    draw: Paint()
  },
  'Bleed them together': {
    draw: Paint()
  },
  'Look at the shader': {
    draw: Paint(),
    overlay: <>
      <Code src='./scenes/bleed.tsx' frame={hbox(STAGE)[0]} />
    </>
  }
}

function Paint(props?, cell?: Cell) {
  if (!cell) return Seed(Paint, {})
  cell.read(RecordStroke({ node: 'manila', color }))
  cell.read(PaintStroke({
    node: 'manila',
    framebuffer: props.output,
    batchSize: 100,
    uImage: ImageTexture({ src: skyline })
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
    batchSize: 100,
    uImage: ImageTexture({ src: skyline })
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
    fs: `
      precision highp float;
      uniform sampler2D uInput;
      varying vec3 vPosition;
      uniform float uStep;

      vec4 bleed() {
        vec4 self = texture2D(uInput, vec2(vPosition));
        vec4 bleedColor = self;
        for (float dx = -1.0; dx <= 1.1; ++dx) {
          for (float dy = -1.0; dy <= 1.1; ++dy) {
            vec4 val = texture2D(uInput,
              vec2(vPosition) + vec2(
                uStep * dx,
                uStep * dy
              )
            );
            float distance = val.a + length(vec2(dx, dy)) / 500.0;
            float delta = distance - self.a;
            if (delta < 0.0) {
              bleedColor = vec4(val.rgb, distance);
            }
          }
        }
        return bleedColor;
      }

      void main() {
        vec4 self = texture2D(uInput, vec2(vPosition));
        vec4 bleedColor = bleed();
        gl_FragColor = vec4(((bleedColor + self) / 2.0).rgb, bleedColor.a);
      }
    `,
  })
})