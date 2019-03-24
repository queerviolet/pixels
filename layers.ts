import { TRIANGLE_STRIP } from 'luma.gl/constants'
import { Texture2D } from 'luma.gl'

import { Cell, Seed } from './loop'

import Shader from './shader'
import { Stage } from './contexts'

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

  const aPosition = cell.read(Stage.aPosition)
  const uCount = cell.read(Stage.uCount)
  const stage = cell.read(STAGE_SHADER)
  if (!aPosition || !stage) return

  stage.vertexArray.setAttributes({ aPosition })  
  
  for (let input of layers) {
    const layer = cell.read(input)
    if (!layer) continue
    const uColor = layer.output ? cell.read(layer.output) : cell.read(layer)
    if (!uColor) continue
    const uOpacity = layer.opacity || 1.0
    stage.program.draw({
      vertexArray: stage.vertexArray,
      vertexCount: uCount,
      drawMode: TRIANGLE_STRIP,
      uniforms: {
        uColor,
        uOpacity,        
      }
    })    
  }
}