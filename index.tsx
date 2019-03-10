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

import Data from 'parcel-plugin-writable/client'

import GL from 'luma.gl/constants'
import { Matrix4 } from 'math.gl'
import { withParameters, AnimationLoop, VertexArray, Buffer, Program, Cube, } from 'luma.gl'
import { sync, StreamNode } from './buffer'

import { render } from 'react-dom'
import * as React from 'react'
import Loop, { Print, Value, Cell, useRead, Evaluate, createLoop } from './loop'
import { ReactElement, useRef, useEffect, useContext, MutableRefObject } from 'react';
import { Schema } from 'var:*';

const GLContext = React.createContext(null)

const DataBuffer = Evaluate <WithPath & WithSchema> (
  function DataBuffer({ schema, path }, cell) {
    return cell.effect <StreamNode> (
      <AllocDataBuffer key='alloc-buffer'
        path={path}
        schema={schema} />
    )
  }
)

const AllocDataBuffer = ({ _, schema, path }: Output<StreamNode> | any) => {
  const gl = useContext(GLContext)
  useEffect(() => {
    if (!gl) return
    const keys = Object.keys(schema)
    const out = {}
    let i = keys.length; while (i --> 0) {
      const k = keys[i]
      out[k] = sync(gl, schema[k])
    }
    _(Data(path)(out))
    return // TODO: Unlisten to the sync action, dispose buffer
  }, [gl, schema, path])
  return null
}

type Output<T> = { _: (value: T) => void }

const ReadStroke = Evaluate<WithPath & WithData>(
  function ReadStroke({
    path,
    data = <DataBuffer
      path={path}
      schema={{
        pos: {
          size: 2,
          type: GL.FLOAT,
        },
        pressure: {
          size: 1,
          type: GL.FLOAT
        }
      }} />
  }, cell) {
    cell.effect(
      <CopyEventsToStroke key='copy-events'
        data={data}  />
    )

    return cell.read(data).value
  }
)

function CopyEventsToStroke({ data }: { data: React.ReactElement }) {
  const stroke = useRead(data).value
  const receiver = useRef<HTMLDivElement>()

  useEffect(() => {
    if (!receiver.current || !stroke) return
    const canvas = receiver.current 
    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchstart', onTouch)
    canvas.addEventListener('touchmove', onTouch)
    canvas.addEventListener('touchend', onTouch)

    function onTouch(t: TouchEvent) {
      const { touches } = t
      t.preventDefault()
      let i = touches.length; while (i --> 0) {
        const touch = touches.item(i)
        stroke({
          pos: frameCoordsFrom(touch),
          pressure: touch.force,
        })
        console.log('emitted', t)
      }
    }

    function onMouseMove(ev: MouseEvent) {
      console.log(ev)
      stroke({
        pos: frameCoordsFrom(ev),
        pressure: 0.5
      })
    }

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchstart', onTouch)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchend', onTouch)
    }
  }, [receiver, data])
  
  return <div ref={receiver} style={{width: '100%', height: '100%'}} />
}

type WithPath = { path?: string }
type WithSchema = { schema: Schema }
type WithData = { data?: ReactElement }

const lumaLoop = new AnimationLoop({
  useDevicePixels: true,
  onInitialize({ gl, canvas }) {
    const loop = createLoop()
    ;(window as any).loop = loop

    render(
        <GLContext.Provider value={gl}>
          <Loop loop={loop}>
            <Print input={<Value value='hi there' />} />
            <Print input={<Value value='hi there' />} />
            <Print input={<Value value='should be only one hello' />} />
            <ReadStroke path="another-stroke" />
          </Loop>
        </GLContext.Provider>,
      document.getElementById('main'))

    const stroke = Data('stroke')({
      pos: sync(gl, {
        size: 2,
        type: GL.FLOAT,
      }),
      pressure: sync(gl, {
        size: 1,
        type: GL.FLOAT
      }),
    })
    ;(window as any).stroke = stroke

    const program = new Program(gl, {
      vs: `
        attribute vec2 pos;
        attribute float pressure;
        uniform mat4 uProjection;
        varying float vPressure;

        void main() {
          gl_Position = uProjection * vec4(pos.x, pos.y, 0.0, 1.0);
          gl_PointSize = 5.0 * pressure * 7.0;
          vPressure = pressure;
        }
      `,
      fs: `
        precision highp float;
        varying float vPressure;

        void main() {
          gl_FragColor = vec4(1.0, 0.0, 1.0, vPressure);
        }
      `,
    })

    canvas.style = ''
    const vertexArray = new VertexArray(gl, { program });
    
    return {
      program,  
      stroke,
      vertexArray, 
      loop     
    }
  },

  onRender({ gl, loop, program, vertexArray, stroke }) {
    loop.run()

    gl.clearColor(0.0, 0.0, 0.0, 1.0)
    gl.clear(GL.COLOR_BUFFER_BIT)
    if (!stroke.pos.stream.buffer) return
    if (!stroke.pressure.stream.buffer) return
    vertexArray.setAttributes({
      pos: stroke.pos.stream.buffer,
      pressure: stroke.pressure.stream.buffer,
    })

    const uProjection = new Matrix4().ortho({
      top: -9,
      bottom: 9,
      left: -16,
      right: 16, 
      near: -1, far: 1000
    })

    program.setUniforms({
      uProjection
    })

    withParameters(gl, {
      [GL.BLEND]: true,
      // blendColor: [GL.BLEND_COLOR],
      // blendEquation: [GL.FUNC_ADDGL.BLEND_EQUATION_RGB, GL.BLEND_EQUATION_ALPHA],
      // blendFunc: [GL.BLEND_SRC_RGB, GL.BLEND_SRC_ALPHA],

      blendFuncPart: [GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.CONSTANT_ALPHA, GL.ZERO],
      // blendEquation: GL.FUNC_ADD
    }, () => program.draw({
      vertexArray,
      vertexCount: stroke.pos.stream.count,
      drawMode: GL.POINTS,     
    }))
  }
})

lumaLoop.start()
import hot from './hot'
hot(module).onDispose(() => {
  lumaLoop.stop()
  const { canvas } = lumaLoop.gl
  canvas && canvas.parentNode.removeChild(canvas)
})