import { applyLetterbox } from './letterbox'

applyLetterbox()

const stroke = require('var:stroke')

import GL from 'luma.gl/constants'
import { Matrix4 } from 'math.gl'
import { AnimationLoop, VertexArray, Buffer, Program, Cube, } from 'luma.gl'
import { Stream } from './buffer';

new AnimationLoop({
  webgl1: false,
  useDevicePixels: true,
  onInitialize({ gl, canvas }) {
    const positions = new Stream(gl, {
      size: 2,
      type: GL.FLOAT,
    })
    stroke.updates.subscribe(m => {
      m.data ? positions.push(m.data) : positions.clear()
    })

    const pt = new Float32Array(2)
    const bytes = new Uint8Array(pt.buffer)
    canvas.addEventListener('mousemove', ev => {
      const { target, offsetX, offsetY } = ev
      const w = target.width / devicePixelRatio
      const h = target.height / devicePixelRatio
      const x = 32 * (offsetX / w) - 16
      const y = 18 * (offsetY / h) - 9
      pt.set([x, y])
      stroke.push(bytes)
    })
    
    const program = new Program(gl, {
      vs: `#version 300 es
        in vec2 pos;
        uniform mat4 uProjection;

        void main() {
          // gl_Position = vec4(pos.x / 600.0, pos.y / 600.0, 1.0, 1.0);
          gl_Position = uProjection * vec4(pos.x, pos.y, 0.0, 1.0);
          gl_PointSize = 16.0;
        }
      `,
      fs: `#version 300 es
        precision highp float;
        out vec4 color;

        void main() {
          color = vec4(1.0, 0.0, 1.0, 1.0);
        }
      `,
    })

    canvas.style = ''
    const vertexArray = new VertexArray(gl, { program });
    
    return {
      program,  
      positions,
      vertexArray,
    }
  },

  onRender({ gl, program, canvas, vertexArray, positions }) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.clear(GL.COLOR_BUFFER_BIT)
    if (!positions.buffer) return
    vertexArray.setAttributes({
      pos: positions.buffer,
    })
   

    const uProjection = new Matrix4().ortho({
      top: -9,
      bottom: 9,
      left: -16,
      right: 16, 
      near: 0.1, far: -1000
    })
    ;(window as any).film = uProjection
    program.setUniforms({
      uProjection
    })

    program.draw({
      vertexArray,
      vertexCount: positions.count,
      drawMode: GL.LINE_STRIP,
    })
  }
}).start()