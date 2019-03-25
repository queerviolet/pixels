import * as React from 'react'
import { useContext, useReducer, useEffect } from 'react'

import { Presentation, Beat } from './scenes'
import { Context as Lifeform, Eval } from './loop'
import { Framebuffer } from './framebuffer'
import Layers from './layers'

export interface Props {
  play: Presentation
}

const BEAT = 'Presentation.currentBeat'

export default function Player({ play }: Props) {
  const grow = useContext(Lifeform)
  const [beat, go] = useReducer(
    (beat, action) =>
      action === 'next'
        ? beat.next ? beat.next : beat
        : beat.prev ? beat.prev : beat
    , play.first)
  
  useEffect(() => {
    console.log('Beat is now:', beat)
    grow(BEAT).write(beat)
  }, [beat])

  useEffect(() => {
    addEventListener('keydown', onKeyDown)
    return () => removeEventListener('keydown', onKeyDown)
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        return go('next')

      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        return go('prev')
      }
    }
  }, [])

  return <>
    <Eval>{
      (_, cell) => {
        // cell.effect<{last: Beat}>('last-beat', _ => _({ last: null }))
        const newBeat = cell.read<Beat>(BEAT)
        const output = cell.readChild(Framebuffer())
        cell.read(newBeat.draw.withProps({ output }))
        cell.read(Layers([ output ]))
      }
    }</Eval>
    { beat.overlay ? beat.overlay : null }
  </>
}