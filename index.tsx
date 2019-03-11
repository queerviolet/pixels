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
import * as Luma from 'luma.gl'
import { sync, StreamNode, Stream } from './buffer'

import { render } from 'react-dom'
import * as React from 'react'
import Loop, { Print, Value, Cell, useRead, Evaluate, createLoop, isContext } from './loop'
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
    return cell.effect(
      <CopyEventsToStroke key='copy-events'
        stroke={cell.read(data).value} />
    )
  }
)

function CopyEventsToStroke({ _, stroke }: any) {
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
      }
    }

    function onMouseMove(ev: MouseEvent) {
      stroke({
        pos: frameCoordsFrom(ev),
        pressure: 0.5
      })
      _(stroke)
      console.log(ev)
    }

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchstart', onTouch)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchend', onTouch)
    }
  }, [receiver, stroke])
  
  return <div ref={receiver} style={{width: '100%', height: '100%'}} />
}

type WithPath = { path?: string }
type WithSchema = { schema: Schema }
type WithData = { data?: ReactElement }
type WithShaderSource = { vs: string, fs: string }
type WithProgram = { program?: ReactElement }

const Shader = Evaluate<WithShaderSource>(
  function Shader({ vs, fs }, cell) {
    return cell.effect(
      <ShaderProgram key='program' vs={vs} fs={fs} />
    )
  }
)

function ShaderProgram({ _, vs, fs }: any) {
  const gl = useContext(GLContext)
  useEffect(() => {    
    const program = new Luma.Program(gl, { vs, fs })    
    _(program)
    return () => program.delete()
  }, [gl, vs, fs])
  return null
}

const Draw = Evaluate<any> (
  function Draw({ program, vertexArray: update, drawMode=GL.POINTS, params }, cell) {
    const gl = cell.read(GLContext).value
    if (!gl) return

    const p = cell.read(program).value
    if (!p) return
    const vertexArray = update && cell.effect(
      <VertexArrayForProgram key='create-vertex-array' program={p} />
    )
    if (!vertexArray) return
    const vertexCount = vertexArray ? update({ vertexArray }, cell) : 0
    if (!vertexCount) return

    const draw = () => p.draw({
      vertexArray,
      vertexCount,
      drawMode,
    })

    console.log('drawing', vertexArray, vertexCount)
    if (params)
      Luma.withParameters(gl, params, draw)
    else
      draw()
    return (cell.value || 0) + 1
  }
)

const readFromStroke = (stroke: any) => ({ vertexArray }, cell) => {
  const s = cell.read(stroke).value
  if (!s || !vertexArray || !s.pos.stream.buffer || !s.pressure.stream.buffer) {
    console.log(vertexArray)
    return 0
  }

  console.log('setting attributes', s.pos.stream.buffer, s.pressure.stream.buffer)
  ;(window as any).s = s
  
  vertexArray.setAttributes({
    pos: s.pos.stream.buffer,
    pressure: s.pressure.stream.buffer,
  })
  return s.pos.stream.count
}

function VertexArrayForProgram({ _, program }: any) {
  const gl = useContext(GLContext)
  useEffect(() => {
    if (!gl || !program) return
    const vertexArray = new Luma.VertexArray(gl, { program });
    _(vertexArray)
  }, [gl, program])
  return null
}


const lumaLoop = new Luma.AnimationLoop({
  useDevicePixels: true,
  onInitialize({ gl, canvas }) {
    const loop = createLoop()
    ;(window as any).loop = loop

    loop(GLContext).write(gl)

    render(
        <GLContext.Provider value={gl}>
          <Loop loop={loop}>
            <Print input={<Value value='hi there' />} />
            <Print input={<Value value='hi there' />} />
            <Print input={<Value value='should be only one hello' />} />
            <Draw
              params={{
                [GL.BLEND]: true,
                // blendColor: [GL.BLEND_COLOR],
                // blendEquation: [GL.FUNC_ADDGL.BLEND_EQUATION_RGB, GL.BLEND_EQUATION_ALPHA],
                // blendFunc: [GL.BLEND_SRC_RGB, GL.BLEND_SRC_ALPHA],
          
                blendFuncPart: [GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.CONSTANT_ALPHA, GL.ZERO],
              }}
              program={
                <Shader
                  vs={`
                    attribute vec2 pos;
                    attribute float pressure;
                    uniform mat4 uProjection;
                    varying float vPressure;
            
                    void main() {
                      gl_Position = uProjection * vec4(pos.x, pos.y, 0.0, 1.0);
                      gl_PointSize = 5.0 * pressure * 7.0;
                      vPressure = pressure;
                    }
                  `}
                  fs={`
                    precision highp float;
                    varying float vPressure;
            
                    void main() {
                      gl_FragColor = vec4(1.0, 1.0, 1.0, vPressure);
                    }
                  `} />
              }
              vertexArray={
                readFromStroke(<ReadStroke path="another-stroke" />)
              } />
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

    const program = new Luma.Program(gl, {
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
    const vertexArray = new Luma.VertexArray(gl, { program });
    
    return {
      program,  
      stroke,
      vertexArray, 
      loop     
    }
  },

  onRender({ gl, loop, program, vertexArray, stroke }) {
    // gl.clearColor(0.0, 0.0, 0.0, 1.0)
    // gl.clear(GL.COLOR_BUFFER_BIT)
    // if (!stroke.pos.stream.buffer) return
    // if (!stroke.pressure.stream.buffer) return
    // vertexArray.setAttributes({
    //   pos: stroke.pos.stream.buffer,
    //   pressure: stroke.pressure.stream.buffer,
    // })

    // const uProjection = new Matrix4().ortho({
    //   top: -9,
    //   bottom: 9,
    //   left: -16,
    //   right: 16, 
    //   near: -1, far: 1000
    // })

    // program.setUniforms({
    //   uProjection
    // })

    // Luma.withParameters(gl, {
    //   [GL.BLEND]: true,
    //   // blendColor: [GL.BLEND_COLOR],
    //   // blendEquation: [GL.FUNC_ADDGL.BLEND_EQUATION_RGB, GL.BLEND_EQUATION_ALPHA],
    //   // blendFunc: [GL.BLEND_SRC_RGB, GL.BLEND_SRC_ALPHA],

    //   blendFuncPart: [GL.ONE_MINUS_SRC_ALPHA, GL.ZERO, GL.CONSTANT_ALPHA, GL.ZERO],
    //   // blendEquation: GL.FUNC_ADD
    // }, () => program.draw({
    //   vertexArray,
    //   vertexCount: stroke.pos.stream.count,
    //   drawMode: GL.POINTS,     
    // }))

    loop.run()
  }
})

console.log(GLContext, isContext(GLContext))

lumaLoop.start()
import hot from './hot'
hot(module).onDispose(() => {
  lumaLoop.stop()
  const { canvas } = lumaLoop.gl
  canvas && canvas.parentNode.removeChild(canvas)
})