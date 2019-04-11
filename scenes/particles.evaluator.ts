export default function Particles(props?, cell?: Cell) { 
  if (!cell) return Seed(Particles, props)
  const { node, output, color, fs } = props

  $(RecordStroke({ node, color }))

  const particles = $Child(
    Rumination({
      uniforms: { uStep: 0.001, },
      width: props.width,
      height: props.height,
      shader: Shader({
        vs: require('../stage.vert'),
        fs,
      })
    })
  )  
  if (!particles) return

  // const paint = $Child(
  //   PaintStroke({
  //     node,
  //     batchSize: 80,
  //     deltaColor: props.deltaColor,
  //   })
  // )

  const emit = $Child(
    PaintParticles({
      node,
      batchSize: 80,
    })
  )
  emit && emit(particles.dst)

  // paint && paint(bleed.dst)

  return $(
    Layers([
      { output: particles, opacity: 1.0 },
      { destination: output }
    ])
  )
}







import { Cell, Seed, $, $Child } from '../loop'
import RecordStroke from '../record-stroke'
import Rumination from '../rumination'
import Shader from '../shader'
import PaintStroke from '../paint-stroke'
import PaintParticles from '../paint-particles'
import Layers from '../layers'
import { Framebuffer } from '../framebuffer'

