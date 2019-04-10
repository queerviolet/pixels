import hot from './hot'
import './stage'
import { GLContext, DataContext, Clock, Camera, Stage } from './contexts'
import prez from './scenes'
window['SLIDES'] = prez


import GL from 'luma.gl/constants'
import { Matrix4, radians } from 'math.gl'
import * as Luma from 'luma.gl'

import { render } from 'react-dom'
import * as React from 'react'
import Loop, { Eval, createLoop, isContext } from './loop'

const QUAD_VERTS = new Float32Array([
  1, 1, 0,   -1, 1, 0,
  1, -1, 0, -1, -1, 0])


import defaultClient from './parcel-plugin-writable/src/client'
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

  onRender({ time, $, }) {
    $(Clock).write(time)
    $.run(time)
  },
})

lumaLoop.start()

hot(module).onDispose(() => {
  lumaLoop.stop()
  const { canvas=null } = lumaLoop.gl || {}
  canvas && canvas.parentNode.removeChild(canvas)
})
