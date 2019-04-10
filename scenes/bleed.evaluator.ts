// Ex:
//
//    Bleed({ node: 'batanes', color })
//
export default function Bleed(props?, cell?: Cell) { 
  if (!cell) return Seed(Bleed, props)
  const { node, output, color } = props

  $(RecordStroke({ node, color }))

  const bleed = $Child(
    Rumination({
      uniforms: { uStep: 0.001, },
      shader: Shader({
        vs: require('../stage.vert'),
        fs: require('./bleed.frag'),
      })
    })
  )  
  if (!bleed) return

  const paint = $(
    PaintStroke({
      node,
      batchSize: 80,
    })
  )

  paint && paint(bleed.dst)

  return $(
    Layers([
      { output: bleed, opacity: 1.0 },
      { destination: output }
    ])
  )
}







import { Cell, Seed, $, $Child } from '../loop'
import RecordStroke from '../record-stroke'
import Rumination from '../rumination'
import Shader from '../shader'
import PaintStroke from '../paint-stroke'
import Layers from '../layers'
