import hot from './hot'
import './stage'
import { GLContext, DataContext, Clock, Camera, Stage } from './contexts'
import { QueueBuffer, VertexArrayBuffer } from './buffers'
import { Seed, Cell, withProps } from './loop'

import Data, { write } from 'parcel-plugin-writable/src/node'
import { vec2, float } from 'parcel-plugin-writable/src/struct'
import prez from './scenes'
window['SLIDES'] = prez


import GL from 'luma.gl/constants'
import { Matrix4, radians } from 'math.gl'
import * as Luma from 'luma.gl'

import { render } from 'react-dom'
import * as React from 'react'
import Loop, { Eval, createLoop, isContext } from './loop'

//@ts-ignore
import headshot from './ashi-headshot-02.jpg'
//@ts-ignore
import skyline from './manila-skyline.jpg'

const QUAD_VERTS = new Float32Array([
  1, 1, 0,   -1, 1, 0,
  1, -1, 0, -1, -1, 0])

import Inspector from './inspector'

import Points from './points'
import RecordStroke from './record-stroke'
import ImageTexture from './image-texture'
import Shader from './shader'
import PaintStroke from './paint-stroke'
import Rumination from './rumination'
import Layers from './layers'

import defaultClient from './parcel-plugin-writable/src/client'
import { Framebuffer } from './framebuffer'
import Player from './player'

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

const lumaLoop = new Luma.AnimationLoop({
  useDevicePixels: true,
  onInitialize({ gl, canvas }) {
    console.log('******* Supported Extensions: *******')
    console.log(gl.getSupportedExtensions())
    console.log('OES_texture_float:', gl.getExtension('OES_texture_float'))

    Luma.setParameters(gl, {
      clearColor: [0, 0, 0, 1],
      clearDepth: 0,
      [GL.BLEND]: false,
      depthTest: false,
      depthFunc: GL.LEQUAL,
    })

    const loop = createLoop()
    window['LOOP'] = loop    

    loop(GLContext).write(gl)
    loop(DataContext).write(defaultClient)
    loop(Camera.uProjection).write(new Matrix4().ortho({
      top: -9,
      bottom: 9,
      left: -16,
      right: 16, 
      near: -0.1, far: 100
    }))
    loop(Stage.aPosition).write(new Luma.Buffer(gl, QUAD_VERTS))
    loop(Stage.uCount).write(QUAD_VERTS.length / 3)

    const showInspector = true;
    render(
        <Loop loop={loop}>
          {showInspector ? <Inspector /> : null}
          <Player play={prez} />
          {/* <Eval>{
            (_, cell) => {
              cell.read(RecordStroke({ node: 'skyline' }))
        
              const points = cell.readChild(Framebuffer())
              if (!points) return
              
              cell.read(Points({
                node: 'skyline',
                uImage: ImageTexture({ src: skyline }),
                output: points,      
              }))
              const bleed = cell.read(BLEED)

              if (!bleed) return

              cell.read(PaintStroke({
                node: 'skyline',
                framebuffer: bleed.input,
                batchSize: 100,
                uImage: ImageTexture({ src: skyline })
              } as any))

              cell.read(Layers([
                { output: points, opacity: 0.5 },
                { output: bleed, opacity: 1.0 },
              ]))
            }
          }</Eval> */}
        </Loop>,
      document.getElementById('main'))

    canvas.style = ''
    
    return {
      loop     
    }
  },

  onRender({ tick, loop, }) {
    loop(Clock).write(tick)
    loop.run(tick)
  },
})

lumaLoop.start()

hot(module).onDispose(() => {
  lumaLoop.stop()
  const { canvas=null } = lumaLoop.gl || {}
  canvas && canvas.parentNode.removeChild(canvas)
})
