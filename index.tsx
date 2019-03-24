import hot from './hot'
import './stage'
import { GLContext, DataContext, Clock, Camera, Stage } from './contexts'
import { QueueBuffer, VertexArrayBuffer } from './buffers'
import { Seed, Cell } from './loop'

import Data, { write } from 'parcel-plugin-writable/src/node'
import { vec2, float } from 'parcel-plugin-writable/src/struct'

import GL from 'luma.gl/constants'
import { Matrix4, radians } from 'math.gl'
import * as Luma from 'luma.gl'

import { render } from 'react-dom'
import * as React from 'react'
import Loop, { Eval, createLoop, isContext } from './loop'

//@ts-ignore
// import headshot from './ashi-headshot-02.jpg'
//@ts-ignore
import skyline from './manila-skyline.jpg'
const QUAD_VERTS = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0])

import Inspector from './inspector'

import RecordStroke from './record-stroke'
import ImageTexture from './image-texture'
import Shader from './shader'
import Swapper from './swapper'
import PaintStroke from './paint-stroke'


import defaultClient from './parcel-plugin-writable/src/client'

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

    const loop = createLoop()
    window['LOOP'] = loop    

    loop(GLContext).write(gl)
    loop(DataContext).write(defaultClient)
    loop(Camera.uProjection).write(new Matrix4().ortho({
      top: -9,
      bottom: 9,
      left: -16,
      right: 16, 
      near: -0.1, far: 100
    }))
    loop(Stage.aPosition).write(new Luma.Buffer(gl, QUAD_VERTS))

    const showInspector = false;
    render(
        <Loop loop={loop}>
          {showInspector ? <Inspector /> : null}
          <Eval>{
            (_, cell) => {
              const gl = cell.read(GLContext)
              if (!gl) return

              const { src, dst } = cell.read(Swapper()) || ({} as any)
              if (!src || !dst) return

              cell.read(RecordStroke({ node: 'skyline' }))
              cell.read(PaintStroke({
                node: 'skyline',
                framebuffer: src,
                batchSize: 10,
                uImage: ImageTexture({ src: skyline })
              }))
        
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

              const pos = cell.read(VertexArrayBuffer({ data: 'skyline/pos.vec2' }))
              const force = cell.read(VertexArrayBuffer({ data: 'skyline/force.float' }))

              if (!pos || !force) return
            
              const vertexCount = pos.count
              if (!vertexCount) return

              vertexArray.setAttributes({
                pos: pos.buffer,
                force: force.buffer,
              })

              const uProjection = cell.read(Camera.uProjection)
              const stageVerts = cell.read(Stage.aPosition)

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
          
              const draw = () => program.draw({
                vertexArray,
                vertexCount,
                drawMode: GL.POINTS,
                uniforms: {
                  uProjection,
                  uImage: cell.read(ImageTexture({ src: skyline }))
                }
              })
          
              Luma.withParameters(gl, {
                // [GL.BLEND]: true,
                // blendFunc: [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
              }, draw)
            }
          }</Eval>
        </Loop>,
      document.getElementById('main'))

    canvas.style = ''
    
    return {
      loop     
    }
  },

  onRender({ tick, loop, }) {
    loop(Clock).write(tick)
    loop.run(tick)
  },
})

lumaLoop.start()

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
