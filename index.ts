const stroke = require('var:stroke')

const pt = new Float32Array(2)
const bytes = new Uint8Array(pt.buffer)
addEventListener('mousemove', ev => {
  pt.set([ev.clientX, ev.clientY])
  stroke.push(bytes)
})

import GL from 'luma.gl/constants'
import { Matrix4 } from 'math.gl'
import { AnimationLoop, VertexArray, Buffer, Program, Cube, } from 'luma.gl'
import { Vec2Buffer } from './buffer';

new AnimationLoop({
  webgl1: false,
  useDevicePixels: true,
  onInitialize({ gl, canvas }) {
    const positions = new Vec2Buffer(gl, 100)
    stroke.value.subscribe(data => {
      positions.push(data)
    })

    const program = new Program(gl, {
      vs: `#version 300 es
        in vec2 pos;
        uniform mat4 uProjection;

        void main() {
          // gl_Position = vec4(pos.x / 600.0, pos.y / 600.0, 1.0, 1.0);
          gl_Position = uProjection * vec4(pos.x, pos.y, -300.0, 1.0);
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
      drawMode: GL.POINTS,
    })

    canvas.style.width = '100vw'
    canvas.style.height = '100vh'
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
    console.log(positions.buffer.byteLength)
    vertexArray.setAttributes({
      pos: positions.buffer,
    })
   
    // vertexArray.setAttributes({
    //   pos: new Float32Array([300, 300])
    // })

    const uProjection = new Matrix4().ortho({left: 0, right: canvas.width, top: 0, bottom: canvas.height})
    ;(window as any).film = uProjection
    program.setUniforms({
      uProjection
    })

    program.draw({
      vertexArray,
      vertexCount: positions.count,
      drawMode: GL.POINTS,      
    })
  }
}).start()