import * as GL from 'luma.gl/constants'
import { withParameters, Texture2D } from 'luma.gl'

import { Cell, Seed } from './loop'

import Shader from './shader'
import { GLContext, Stage } from './contexts'

export type Layer = {
  output: Texture2D
  opacity?: number
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

export default function Layers(layers: Layer[], cell?: Cell) {
  if (!cell) return Seed(Layers, layers)

  const gl = cell.read(GLContext)
  const aPosition = cell.read(Stage.aPosition)
  const uCount = cell.read(Stage.uCount)
  const stage = cell.read(STAGE_SHADER)
  if (!gl || !aPosition || !stage) return

  stage.vertexArray.setAttributes({ aPosition })  

  withParameters(gl, {
    [GL.BLEND]: true,
    blendFunc: [GL.SRC_ALPHA, GL.ONE_MINUS_SRC_ALPHA]
  }, () => {
    gl.clear(GL.COLOR_BUFFER_BIT)
    for (let input of layers) {
      const layer = cell.read(input)
      if (!layer) continue
      const uColor = cell.read(layer.output ? layer.output : cell.read(layer))
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
}