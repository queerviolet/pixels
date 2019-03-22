import { applyLetterbox, Box } from './letterbox'

const WIDTH = 16
const HEIGHT = 9
let frame: Box | null = null
applyLetterbox(WIDTH / HEIGHT, box => frame = box)

const global = window as any

const frameCoordsFrom = ({
  clientX, clientY,
}) =>
  [
    2 * WIDTH * (clientX - frame.left) / frame.width - WIDTH,
    2 * HEIGHT * (clientY - frame.top) / frame.height - HEIGHT,
  ]

import Data, { write } from 'parcel-plugin-writable/src/node'
import { dtype, vec2, float } from 'parcel-plugin-writable/src/struct'

import GL from 'luma.gl/constants'
import { Matrix4 } from 'math.gl'
import * as Luma from 'luma.gl'
import { Stream } from './buffer'

import { render } from 'react-dom'
import * as React from 'react'
import Loop, { Eval, createLoop, isContext } from './loop'
import { TextureDataStream } from './texture'

import { ReactElement, useRef, useEffect, useContext } from 'react';
import { Schema } from 'var:*';

const GLContext = React.createContext(null)
const DataContext = React.createContext(null)

function RecordStroke(props: WithNode, cell?: Cell) {
  if (!cell) return Seed(RecordStroke, props)
  const { node } = props
  return cell.effect('listen-and-write', () => {
    const pos = Data(node, ['pos'], vec2)
    const force = Data(node, ['force'], float)

    const canvas = document.createElement('div')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.position = 'fixed'
    canvas.style.zIndex = '100'
    document.body.appendChild(canvas)

    canvas.addEventListener('mousemove', onMouseMove)
    canvas.addEventListener('touchstart', onTouch)
    canvas.addEventListener('touchmove', onTouch)
    canvas.addEventListener('touchend', onTouch)

    function onTouch(t: TouchEvent) {
      const { touches } = t
      t.preventDefault()
      let i = touches.length; while (i --> 0) {
        const touch = touches.item(i)
        pos.set(frameCoordsFrom(touch))
        force.set([touch.force])
        write(pos)
        write(force)
      }
    }

    function onMouseMove(ev: MouseEvent) {  
      pos.set(frameCoordsFrom(ev) as any)
      force.set([0.5])
      write(pos)
      write(force)
    }

    return () => {
      canvas.removeEventListener('mousemove', onMouseMove)
      canvas.removeEventListener('touchstart', onTouch)
      canvas.removeEventListener('touchmove', onTouch)
      canvas.removeEventListener('touchend', onTouch)
      document.body.removeChild(canvas)
    }
  }, [node])
}


type WithNode = { node?: string }
type WithShaderSource = { vs: string, fs: string }

import { Seed, Cell } from './loop'

function Shader(props: WithShaderSource, cell?: Cell) {
  if (!cell) return Seed(Shader, props)
  const { vs, fs } = props
  const gl = cell.read(GLContext)
  return cell.effect('program', _ => {    
    console.log(vs, fs)
    const program = new Luma.Program(gl, { vs, fs })    
    const vertexArray = new Luma.VertexArray(gl, { program })
    _({program, vertexArray})
    return (binding: any) => {
      if (!binding) return
      const { program, vertexArray } = binding
      program.delete()
      vertexArray.delete()
    }
  }, [gl, vs, fs])
}

const Clock = React.createContext(0)


type WithCol = {
  node: string
  column: string[]
  dtype: string
}

const DTYPES: { [key: string]: dtype }= { float, vec2 }

function VertexArrayBuffer(props: WithCol, cell?: Cell) {
  if (!cell) return Seed(VertexArrayBuffer, props)
  const gl = cell.read(GLContext)
  const client = cell.read(DataContext)
  return cell.effect<Stream>('buffer', _ => {
    const listener = vertexArrayBuffer(gl, props.node, props.column, DTYPES[props.dtype])
    const unsubscribe = listener.onChange(stream => {
      _(stream)
    })
    const disconnect = client.connect(listener, 'Vertex Array Buffer')

    return stream => {
      disconnect()
      unsubscribe()
      stream && stream.clear()
    }
  }, [props.node, props.column, props.dtype])
}

function TextureBuffer(props: WithCol, cell?: Cell) {
  if (!cell) return Seed(TextureBuffer, props)
  const gl = cell.read(GLContext)
  const client = cell.read(DataContext)
  return cell.effect<TextureDataStream>('texture', _ => {
    const listener = textureBuffer(gl, props.node, props.column, DTYPES[props.dtype])
    const unsubscribe = listener.onChange(stream => {
      _(stream)
    })
    const disconnect = client.connect(listener, 'Texture Buffer')

    return stream => {
      disconnect()
      unsubscribe()
      stream && stream.clear()
    }
  }, [props.node, props.column, props.dtype])
}
import { vertexArrayBuffer, textureBuffer } from './buffer-peer'
import defaultClient from './parcel-plugin-writable/src/client'

const lumaLoop = new Luma.AnimationLoop({
  useDevicePixels: true,
  onInitialize({ gl, canvas }) {
    Luma.setParameters(gl, {
      clearColor: [0, 0, 0, 1],
      clearDepth: 0,
      depthTest: true,
      depthFunc: GL.LEQUAL,
    })
    const loop = createLoop()
    ;(window as any).loop = loop

    loop(GLContext).write(gl)
    loop(DataContext).write(defaultClient)
    console.log('OES_texture_float:', gl.getExtension('OES_texture_float'))

    render(
        <GLContext.Provider value={gl}>
          <Loop loop={loop}>
            <Eval>{
              (_, cell) => {
                const gl = cell.read(GLContext)
                if (!gl) return
                cell.read(RecordStroke({ node: 'stylus' }))
            
                const { program, vertexArray } = cell.read(Shader({
                  vs: `
                    attribute vec2 pos;
                    attribute float force;
                    uniform mat4 uProjection;
                    varying float vForce;
            
                    void main() {
                      gl_Position = uProjection * vec4(pos.x, pos.y, 0.0, 1.0);
                      gl_PointSize = 5.0 * force * 7.0;
                      vForce = force;
                    }
                  `,
                  fs: `
                    precision highp float;
                    varying float vForce;
            
                    void main() {
                      gl_FragColor = vec4(1.0, 0.0, 1.0, 0.5 + vForce);
                    }
                  `
                })) || ({} as any)
                if (!program) return

                const pos = cell.read(VertexArrayBuffer({ node: 'stylus', column: ['pos'], dtype: 'vec2' }))
                const force = cell.read(VertexArrayBuffer({ node: 'stylus', column: ['force'], dtype: 'float' }))

                if (!pos || !force) return
              
                const vertexCount = pos.count
                if (!vertexCount) return

                vertexArray.setAttributes({
                  pos: pos.buffer,
                  force: force.buffer,
                })

                const uProjection = new Matrix4().ortho({
                  top: -9,
                  bottom: 9,
                  left: -16,
                  right: 16, 
                  near: -1, far: 1000
                })
                
                program.setUniforms({ uProjection })

                gl.clearColor(0.0, 0.0, 0.0, 1.0)
                gl.clear(GL.COLOR_BUFFER_BIT)

                const cone = cell.effect<Luma.Cone>('cones', _ => {
                  _(new Luma.Cone(gl, {
                    radius: 10,
                    height: 3,
                    cap: true,
                    colors: [1, 1, 1, 1],
                    position: [ 0, 0, 1 ],
                    vs: `
                      // attribute vec2 pos;
                      // attribute float force;
                      attribute vec3 positions;
                      uniform mat4 uProjection;
                      uniform mat4 uModel;
                      // varying float vForce;
                      varying vec3 vPosition;
              
                      void main() {
                        gl_Position = uProjection * uModel * vec4(positions, 1.0);//vec4(pos.x, pos.y, 0.0, 1.0);
                        vPosition = positions;
                        // gl_PointSize = 5.0 * force * 7.0;
                        // vForce = force;
                      }`,
                    fs: `
                      precision highp float;
                      // varying float vForce;
                      varying vec3 vPosition;
              
                      void main() {
                        // gl_FragColor = vec4(1.0, 0.0, 1.0, 0.5 + vForce);
                        // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                        gl_FragColor = vec4(vPosition.xy, 1.0, 1.0);
                      }`,
                  }))
                  return cone => cone.delete()
                }, [gl])

                if (cone) {
                  console.log(cone.geometry);
                  cone.draw({
                    uniforms: {
                      uProjection,
                      uModel: new Matrix4()
                        .rotateX(-Math.PI / 2)
                    }
                  })
                }
            
                const draw = () => program.draw({
                  vertexArray,
                  vertexCount,
                  drawMode: GL.POINTS,
                })
            
                Luma.withParameters(gl, {
                  [GL.BLEND]: true,
                  blendFunc: [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
                }, draw)
              }
            }</Eval>
          </Loop>
        </GLContext.Provider>,
      document.getElementById('main'))

    canvas.style = ''
    
    return {
      loop     
    }
  },

  onRender({ tick, loop, }) {
    loop(Clock).write(tick)
    loop.run()
  }
})

console.log(GLContext, isContext(GLContext))

lumaLoop.start()
import hot from './hot'
import { gt } from 'semver';

hot(module).onDispose(() => {
  lumaLoop.stop()
  const { canvas=null } = lumaLoop.gl || {}
  canvas && canvas.parentNode.removeChild(canvas)
})


// type $<T> = { __$Pattern__: 'Is a pattern', __$Pattern_Type__: T }

// interface Evaluator<Input, Output> {
//   (input: Input): $<Output>
//   (input: Input, cell: any): Output  
// }

// function Eval<I, O>(evaluate: (input: I) => O): Evaluator<I, O> => {

// }

// new Node('stroke').field('pos').shape(vec2)
