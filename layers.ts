import * as GL from 'luma.gl/constants'
import { withParameters, Texture2D, Framebuffer } from 'luma.gl'

import { Cell, Seed, Pattern } from './loop'

import Shader from './shader'
import { GLContext, Stage } from './contexts'

export type Layer = {
  output?: Texture2D
  opacity?: number
  destination?: Framebuffer
  additive?: boolean
}

const STAGE_SHADER = Shader({
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
    uniform float uOpacity;

    void main() {
      gl_FragColor = vec4(texture2D(uColor, vec2(vPosition)).rgb, uOpacity);
    }
  `,
})

const getTexture = (cell: Cell, val: any) => {
  if (!val) return val
  if (val instanceof Pattern) return getTexture(cell, cell.read(val))
  if (val instanceof Texture2D) return val
  if (val instanceof Framebuffer) return val.color
  return getTexture(cell, val.output)
}

export default function Layers(layers: Layer[], cell?: Cell) {
  if (!cell) return Seed(Layers, layers)

  const gl = cell.read(GLContext)
  const aPosition = cell.read(Stage.aPosition)
  const uCount = cell.read(Stage.uCount)
  const stage = cell.read(STAGE_SHADER)
  if (!gl || !aPosition || !stage) return

  stage.vertexArray.setAttributes({ aPosition })  

  const last = layers[layers.length - 1]
  let framebuffer = undefined
  let blendFunc = [GL.SRC_ALPHA, GL.DST_ALPHA]
  let viewport = [0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight]
  if (last && last.destination) {
    framebuffer = last.destination
    viewport = [0, 0, framebuffer.width, framebuffer.height]
  }
  if (last && last.additive)
    blendFunc = [GL.ONE, GL.ONE]

  withParameters(gl, {
    [GL.BLEND]: true,
    blendFunc,
    framebuffer
  }, () => {
    // TODO: Invalidate framebuffers when we draw to
    // avoid having to do this.
    cell.invalidate()    

    gl.clear(GL.COLOR_BUFFER_BIT)
    let i = layers.length; while (i --> 0) {
      const input = layers[i]
      const layer = cell.read(input)
      if (!layer) continue
      const uColor = getTexture(cell, layer)
      if (!uColor) continue
      const uOpacity =
        typeof input.opacity === 'number'
          ? input.opacity
          :
        input['props'] && typeof input['props']['opacity'] === 'number'
          ? input['props']['opacity']
          :
        typeof layer.opacity === 'number'
          ? layer.opacity
          :
          1.0
      gl.viewport(...viewport)
      stage.program.draw({
        vertexArray: stage.vertexArray,
        vertexCount: uCount,
        drawMode: GL.TRIANGLE_STRIP,
        uniforms: {
          uColor,
          uOpacity,        
        }
      })    
    }
  })
  return framebuffer
}