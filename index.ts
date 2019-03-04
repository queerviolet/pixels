import { applyLetterbox, Box } from './letterbox'

const WIDTH = 16
const HEIGHT = 9
let frame: Box | null = null
applyLetterbox(WIDTH / HEIGHT, box => frame = box)

const frameCoordsFrom = ({
  clientX, clientY,
}) =>
  [
    2 * WIDTH * (clientX - frame.left) / frame.width - WIDTH,
    2 * HEIGHT * (clientY - frame.top) / frame.height - HEIGHT,
  ]

import stroke from 'var:stroke'

import GL from 'luma.gl/constants'
import { Matrix4 } from 'math.gl'
import { AnimationLoop, VertexArray, Buffer, Program, Cube, } from 'luma.gl'
import { Stream } from './buffer';

new AnimationLoop({
  useDevicePixels: true,
  onInitialize({ gl, canvas }) {
    const positions = new Stream(gl, {
      size: 2,
      type: GL.FLOAT,
    })
    stroke.updates.subscribe(m => {
      m.type === 'clear'
        ? positions.clear()
        : positions.push(m.data)
    })

    const pt = new Float32Array(2)
    const bytes = new Uint8Array(pt.buffer)
    canvas.addEventListener('mousemove', ev => {
      pt.set(frameCoordsFrom(ev))
      stroke.push(bytes)
    })
    canvas.addEventListener('touchstart', onTouch)
    canvas.addEventListener('touchmove', onTouch)
    canvas.addEventListener('touchend', onTouch)
    function onTouch(t: TouchEvent) {
      const { touches } = t
      let i = touches.length; while (i --> 0) {
        const touch = touches.item(i)
        if (touch.touchType !== 'stylus') continue
        pt.set(frameCoordsFrom(touch))
        stroke.push(bytes)
      }
    }
    
    
    
    const program = new Program(gl, {
      vs: `
        attribute vec2 pos;
        uniform mat4 uProjection;

        void main() {
          gl_Position = uProjection * vec4(pos.x, pos.y, 0.0, 1.0);
          gl_PointSize = 16.0;
        }
      `,
      fs: `
        precision highp float;

        void main() {
          gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0);
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

  onRender({ gl, program, vertexArray, positions }) {
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