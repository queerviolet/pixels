import { applyLetterbox, Box } from './letterbox'

const WIDTH = 16
const HEIGHT = 9
let frame: Box | null = null
applyLetterbox(WIDTH / HEIGHT, box => frame = box)
const STAGE_QUAD = [
  WIDTH, HEIGHT, 0,
  -WIDTH, HEIGHT, 0,
  WIDTH, -HEIGHT, 0,
  -WIDTH, -HEIGHT, 0
]
const QUAD_VERTS = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0])

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
import { Matrix4, radians } from 'math.gl'
import * as Luma from 'luma.gl'
import { Stream } from './buffer'

import { render } from 'react-dom'
import * as React from 'react'
import Loop, { Eval, createLoop, isContext } from './loop'
import { TextureDataStream } from './texture'

//@ts-ignore
import headshot from './ashi-headshot-02.jpg'

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

import { vertexArrayBuffer, textureBuffer, queueBuffer } from './buffer-peer'

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
  }, [props.node, props.column.join('.'), props.dtype])
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
  }, [props.node, props.column.join('.'), props.dtype])
}

function QueueBuffer(props: WithCol, cell?: Cell) {
  if (!cell) return Seed(QueueBuffer, props)
  const client = cell.read(DataContext)
  const dtype = DTYPES[props.dtype]
  const key = 'Queue Buffer for ' + props.node + '/' + props.column.join('.')
  return cell.effect<typeof dtype.ArrayType[]>(key, _ => {
    const listener = queueBuffer(props.node, props.column, dtype)
    const unsubscribe = listener.onChange(stream => {
      ;(stream as any).clear = listener.clear
      _(stream)
    })
    const disconnect = client.connect(listener, key)

    return () => {
      disconnect()
      unsubscribe()
      listener && listener.clear()
    }
  }, [props.node, props.column.join('.'), props.dtype])
}

function ImageTexture(props: { src: string }, cell?: Cell) {
  if (!cell) return Seed(ImageTexture, props)
  const { src } = props
  const img = cell.effect('load-image', _ => {
    const img = new Image()
    img.onload = () => _(img)
    img.src = src
  }, [src])
  if (!img) return
  const gl = cell.read(GLContext)
  return cell.effect<Luma.Texture2D>('create-texture', _ => {
    _(new Luma.Texture2D(gl, {
      data: img,
      parameters: {
        [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
        [GL.TEXTURE_MIN_FILTER]: GL.NEAREST
      },
      pixelStore: {
        [GL.UNPACK_FLIP_Y_WEBGL]: false,
      },
      mipmaps: true
    }))
    return tex => tex.delete()
  }, [img])
}

import defaultClient from './parcel-plugin-writable/src/client'

const lumaLoop = new Luma.AnimationLoop({
  useDevicePixels: true,
  onInitialize({ gl, canvas }) {
    console.log('******* Supported Extensions: *******')
    console.log(gl.getSupportedExtensions())

    Luma.setParameters(gl, {
      clearColor: [0, 0, 0, 1],
      clearDepth: 0,
      [GL.BLEND]: false,
      depthTest: false,
      depthFunc: GL.LEQUAL,
    })
    const loop = createLoop()
    ;(window as any).loop = loop

    loop(GLContext).write(gl)
    loop(DataContext).write(defaultClient)
    console.log('OES_texture_float:', gl.getExtension('OES_texture_float'))

    gl.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT)


    render(
      <GLContext.Provider value={gl}>
        <Loop loop={loop}>
          <Eval>{
            (_, cell) => {
              const gl = cell.read(GLContext)
              if (!gl) return
              
              cell.read(RecordStroke({ node: 'stylus' }))
              const img = cell.read(ImageTexture({ src: headshot }))

              const posQueue = QueueBuffer({ node: 'stylus', column: ['pos'], dtype: 'vec2' }, cell)
              const forceQueue = QueueBuffer({ node: 'stylus', column: ['force'], dtype: 'float' }, cell)
          
              const { program, vertexArray } = cell.read(Shader({
                vs: `
                  attribute vec2 pos;
                  attribute float force;
                  uniform mat4 uProjection;
                  varying float vForce;
                  varying vec2 vPos;
          
                  void main() {
                    gl_Position = uProjection * vec4(pos.x, pos.y, 0.0, 1.0);
                    gl_PointSize = 5.0 * force * 7.0;
                    vForce = force;
                    vPos = pos;
                  }
                `,
                fs: `
                  precision highp float;
                  varying float vForce;
                  uniform sampler2D uImage;
                  varying vec2 vPos;
          
                  void main() {
                    vec2 texPos = vec2((vPos.x + 16.) / 32., (vPos.y + 9.) / 18.);
                    gl_FragColor = texture2D(uImage, texPos);

                    // gl_FragColor = vec4(1.0, 0.0, 1.0, 0.5 + vForce);
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

              // const uProjection = new Matrix4().orthographic({
              //   fov: radians(75), aspect: 16 / 9, near: 0.1, far: 50
              // })
              const uProjection = new Matrix4().ortho({
                top: -9,
                bottom: 9,
                left: -16,
                right: 16, 
                near: -0.1, far: 100
              })
              
              program.setUniforms({
                uProjection,
                uImage: img
              })

              // gl.clearColor(0.0, 0.0, 0.0, 1.0)
              // gl.clear(GL.COLOR_BUFFER_BIT)

              const cone = cell.effect<Luma.Cone>('cones', _ => {                  
                console.log('creating cone')
                _(new Luma.Cone(gl, {
                  radius: 0.5,
                  height: 0.1,
                  cap: false,
                  // isInstanced: 1,
                  // instanceCount: vertexCount,
                  attributes: {
                    pos
                  },
                  vs: `
                    uniform vec2 uPos;
                    uniform float uForce;
                    // attribute float force;
                    attribute vec3 positions;
                    uniform mat4 uProjection;
                    uniform mat4 uModel;                    
                    // varying float vForce;
                    varying vec4 vPosition;
            
                    void main() {
                      // vPosition = (uModel * vec4(positions, 1.0)) + vec4(uPos, positions.y, 0.);
                      vec3 vertex = positions * uForce;
                      vPosition = vec4(vertex.xz + uPos, -vertex.y - 0.5, 1.0);
                      gl_Position = vec4((uProjection * vPosition).xy, vertex.y, 1.0);
                      // gl_PointSize = 5.0 * force * 7.0;
                      // vForce = force;
                    }`,
                  fs: `
                    uniform vec2 uPos;
                    precision highp float;
                    // varying float vForce;
                    varying vec4 vPosition;
                    uniform sampler2D uImage;
            
                    void main() {
                      // gl_FragColor = vec4(1.0, 0.0, 1.0, 0.5 + vForce);
                      // gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
                      // gl_FragColor = vec4(vPosition.xy, 1.0, 1.0);
                      vec2 texPos = vec2((uPos.x + 16.) / 32., (uPos.y + 9.) / 18.);
                      gl_FragColor = vec4(texture2D(uImage, texPos).xyz, 0.0);
                      // gl_FragColor = vec4(-vPosition.z, vPosition.z, vPosition.z, 1.0);
                    }`,
                }))
                return cone => cone.delete()
              }, [ gl ])

              const offscreenA = cell.effect<Luma.Framebuffer>('framebuffer-A', _ => {
                const width = gl.drawingBufferWidth
                const height = gl.drawingBufferHeight
                const framebuffer = new Luma.Framebuffer(gl, {
                  id: 'framebuffer-A',
                  width, height, depth: true,
                })
                framebuffer.checkStatus()
                framebuffer.clear({color: [0, 0, 0, 100], depth: 1, stencil: 0})
                _(framebuffer)
                return () => {
                  framebuffer._deleteHandle()
                }
              }, [gl, gl.drawingBufferWidth, gl.drawingBufferHeight])

              const offscreenB = cell.effect<Luma.Framebuffer>('framebuffer-B', _ => {
                const width = gl.drawingBufferWidth
                const height = gl.drawingBufferHeight
                const framebuffer = new Luma.Framebuffer(gl, {
                  id: 'framebuffer-B',
                  width, height, depth: true,
                })
                framebuffer.checkStatus()
                framebuffer.clear({color: [0, 0, 0, 100], depth: 1, stencil: 0})
                _(framebuffer)
                return () => {
                  framebuffer._deleteHandle()
                }
              }, [gl, gl.drawingBufferWidth, gl.drawingBufferHeight])

              const ticktock = cell.effect<{ tick: boolean }>('ticktock', _ => _({ tick: false }), [])
              ticktock.tick = !ticktock.tick;              
              const [src, dst] = ticktock.tick
                ? [offscreenA, offscreenB]
                : [offscreenB, offscreenA]

              if (img && cone && posQueue && forceQueue && posQueue.length) {
                const uModel = new Matrix4().rotateX(-Math.PI / 2)
                let i = posQueue.length; while (i --> 0) {
                  const uPos = posQueue[i]
                  const uForce = forceQueue[i] || [0];
                  cone.draw({
                    uniforms: {
                      uProjection,
                      uModel,
                      uPos,
                      uForce,
                      uImage: img,
                    },
                    framebuffer: src,
                  })                  
                }
                posQueue.clear()
                forceQueue.clear()
              }
              
              const stageVerts = cell.effect<Luma.Buffer>('stage-triangle-buffer', _ => {
                _(new Luma.Buffer(gl, QUAD_VERTS))
                return buf => buf._deleteHandle()
              }, [gl])

              const bleed = cell.read(Shader({
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
              }))

              if (!bleed) return

              cell.read(Clock)

              bleed.vertexArray.setAttributes({
                aPosition: stageVerts
              })

              bleed.program.draw({
                vertexArray: bleed.vertexArray,
                vertexCount: QUAD_VERTS.length / 3,
                drawMode: GL.TRIANGLE_STRIP,
                framebuffer: dst,
                uniforms: {
                  uInput: src.color,
                  uStep: 0.001,
                }
              })

              const drawStage = cell.read(Shader({
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
                uniform sampler2D uColor;
                varying vec3 vPosition;

                void main() {
                  gl_FragColor = vec4(texture2D(uColor, vec2(vPosition)).rgb, 0.01);
                }
                `,
              }))
              if (!drawStage) return

              drawStage.vertexArray.setAttributes({
                aPosition: stageVerts
              })

              drawStage.program.draw({
                vertexArray: drawStage.vertexArray,
                vertexCount: QUAD_VERTS.length / 3,
                drawMode: GL.TRIANGLE_STRIP,
                uniforms: {
                  uColor: src.color,
                }
              })
          
              // const draw = () => program.draw({
              //   vertexArray,
              //   vertexCount,
              //   drawMode: GL.POINTS,
              // })
          
              // Luma.withParameters(gl, {
              //   [GL.BLEND]: true,
              //   blendFunc: [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
              // }, draw)
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
  },
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
