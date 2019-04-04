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

    const $ = createLoop()
    window['LOOP'] = $    

    $(GLContext).write(gl)
    $(DataContext).write(defaultClient)
    $(Camera.uProjection).write(new Matrix4().ortho({
      top: -9,
      bottom: 9,
      left: -16,
      right: 16, 
      near: -0.1, far: 100
    }))
    $(Stage.aPosition).write(new Luma.Buffer(gl, QUAD_VERTS))
    $(Stage.uCount).write(QUAD_VERTS.length / 3)

    render(
        <Loop loop={$}>
          <Player play={prez} />
        </Loop>,
      document.getElementById('main'))

    canvas.style = ''
    
    return {
      $     
    }
  },

  onRender({ tick, $, }) {
    $(Clock).write(tick)
    $.run(tick)
  },
})

lumaLoop.start()

hot(module).onDispose(() => {
  lumaLoop.stop()
  const { canvas=null } = lumaLoop.gl || {}
  canvas && canvas.parentNode.removeChild(canvas)
})
