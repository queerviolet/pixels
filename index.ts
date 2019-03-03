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

new AnimationLoop({
  webgl1: false,
  useDevicePixels: true,
  onInitialize({ gl, canvas }) {
    const ref = {
      value: new Buffer(gl, {
        data: new Float32Array(1024),
        accessor: {
          size: 2,
          type: GL.FLOAT,
        }
      }),
      size: 0,
    }
    stroke.value.subscribe(data => {
      const f32 = new Float32Array(data.buffer)
      if (!f32.length) return

      console.log(ref.value.reallocate(8 * ref.size + data.byteLength))

      ref.value.subData({ data: f32, offset: ref.size * 8 })
      console.log(ref.size)
      ref.size += f32.length
      console.log(ref.size)
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
      positions: ref,
      vertexArray,
    }
  },

  onRender({ gl, program, canvas, vertexArray, positions }) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.clear(GL.COLOR_BUFFER_BIT)
    if (!positions.value) return
    vertexArray.setAttributes({
      pos: positions.value,
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
      vertexCount: positions.size / 2,
      drawMode: GL.POINTS,      
    })
  }
}).start()