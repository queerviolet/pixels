import * as React from 'react'
import { useContext, useReducer, useEffect } from 'react'

import { Presentation, Beat } from './scenes'
import { Context as Lifeform, Eval } from './loop'
import { Framebuffer } from './framebuffer'
import DrawTexture from './draw-texture'

import Layers from './layers'

import Inspector from './inspector'

import * as Luma from 'luma.gl'


export interface Props {
  play: Presentation
}

const STATE = 'Presentation.state'

type State = {
  ts: DOMHighResTimeStamp
  current: Beat
  prev: Beat
}

export default function Player({ play }: Props) {
  const grow = useContext(Lifeform)
  const [state, go] = useReducer(
    ({current: beat}: State, action: 'next' | 'prev') => ({
      ts: performance.now(),
      current: action === 'next'
          ? beat.next ? beat.next : beat
          : beat.prev ? beat.prev : beat,
      prev: beat,
    }), {
      ts: performance.now(),
      prev: null,
      current: play.first,
    })
  
  const [showInspector, toggleInspector] = useReducer(
    (isVisible: boolean) => !isVisible, false
  )
  
  useEffect(() => {
    console.log('State is now:', state)
    grow(STATE).write(state)
  }, [state])

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

      case '`':
        return toggleInspector('toggle')
      }
    }
  }, [])

  return <>
    <Eval>{
      (_, cell) => {
        // const a = cell.readChild(Framebuffer({name: 'A'}))
        // const b = cell.readChild(Framebuffer({name: 'B'}))
        // if (!a || !b) return

        // const last = cell.effect<{beat: Beat, framebuffers: Luma.Framebuffer[]}>('last-beat', (_, )=> {
        //   _({
        //     beat: null,
        //     framebuffers: [a, b]
        //   })
        // }, [a, b])

        const state = cell.read<State>(STATE)
        if (!state) return
        const { current } = state
        // if (current !== last.beat) {
        //   console.log('changing from', last.beat, 'to', current)
        //   last.beat = current
        // }
        if (!current) return

        // const output = cell.readChild(Framebuffer({name: 'output'}))

        // cell.read(current.draw.withProps({ output }))
        cell.read(Layers([ DrawTexture({ draw: current.draw }) ]))
      }
    }</Eval>
    { state.current.overlay ? state.current.overlay : null }
    { showInspector ? <Inspector /> : null }
  </>
}