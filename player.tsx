import * as React from 'react'
import { useContext, useReducer, useEffect, useState, useMemo, useRef } from 'react'

import { Presentation, Beat } from './scenes'
import { Context as Lifeform, Eval } from './loop'
import { Framebuffer } from './framebuffer'
import DrawTexture from './draw-texture'

import Layers from './layers'

import Inspector from './inspector'

import * as Luma from 'luma.gl'
import { Clock, Presentation as PresentationContext } from './contexts';

import { state as synced, State as StateNode, Loading } from 'parcel-plugin-writable/src/node'
import { BuildIn } from './anim'

const ReactCSSTransitionGroup = require('react-addons-css-transition-group')

export interface Props {
  play: Presentation
  initialBeat?: string
}

type State = {
  ts: DOMHighResTimeStamp
  current: Beat
  prev: Beat
}

type Next = { type: 'next' }
type Prev = { type: 'prev' }
type Seek = { type: 'seek', beat: Beat }
type Action = Next | Prev | Seek

export default function Player({ play }: Props) {
  const grow = useContext(Lifeform)
  const playerState = useMemo(() => synced<string>('player.state'), [])
  const [state, go] = useReducer(
    (state: State, action: Action) => {
      const {current: beat} = state
      const target =
        action.type === 'next'
          ? beat.next ? beat.next : beat
          :
        action.type === 'prev'
          ? beat.prev ? beat.prev : beat
          :
          action.beat
      if (beat === target) return state
          
      return {
        ts: grow(Clock).value || 0,
        current: action.type === 'next'
            ? beat.next ? beat.next : beat
            :
          action.type === 'prev'
            ? beat.prev ? beat.prev : beat
            :
            action.beat,
        prev: beat,
      }
    }, {
      ts: grow(Clock).value || 0,
      prev: null,
      current: playerState.value !== Loading
        ? play.beats[playerState.value as string] || play.first
        : play.first,//initialBeat ? play.beats[initialBeat] : play.first,
    })
  
  const [showInspector, toggleInspector] = useReducer(
    (isVisible: boolean) => !isVisible, false
  )
  window['toggleInspector'] = toggleInspector

  const didGesture = useRef<boolean>()

  useEffect(
    () => grow(PresentationContext.data).write(play), []
  )

  useEffect(() => {
    console.log('State is now:', state.current && state.current.id)
    grow(PresentationContext.playState).write(state)
    if (didGesture.current) {
      playerState.set(state.current && state.current.id)
      didGesture.current = false
    }
  }, [state])

  useEffect(() => {
    addEventListener('keydown', onKeyDown)
    return () => removeEventListener('keydown', onKeyDown)
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        didGesture.current = true
        return go({type: 'next'})

      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
      didGesture.current = true
        return go({type: 'prev'})

      case '`':
        return toggleInspector('toggle')
      }
    }
  }, [])

  useEffect(() => {
    if (playerState.value !== Loading)
      handleStateChange(playerState.value)
    
    return playerState(handleStateChange)
    
    function handleStateChange(id) {
      id && go({ type: 'seek', beat: play.beats[id] || play.first })
    }
  }, [go])

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

        const state = cell.read<State>(PresentationContext.playState)
        if (!state) return
        const { ts, current, prev } = state

        // if (current !== last.beat) {
        //   console.log('changing from', last.beat, 'to', current)
        //   last.beat = current
        // }
        // if (!current) return

        // const output = cell.readChild(Framebuffer({name: 'output'}))

        // cell.read(current.draw.withProps({ output }))

        // const start = state.ts
        // const end = start + 20
        // const now = cell.read(Clock)
        // const t = Math.min(1.0, (now - start) / (end - start))

        const opacity = cell.read(BuildIn({ beat: current.id, ms: 300 }))
        if (typeof opacity !== 'number') return

        const currentFb = cell.read(DrawTexture({ draw: current && current.draw }))

        const prevFb = opacity < 1.0 && cell.read(DrawTexture({ draw: prev && prev.draw }))
        
        cell.read(Layers([
          { output: currentFb, opacity: 1.0 },
          opacity < 1.0 && { output: prevFb, opacity: 1.0 - opacity },
        ]))      
      }
    }</Eval>
    <ReactCSSTransitionGroup
      transitionName='beat'
      transitionEnterTimeout={700}
      transitionLeaveTimeout={700}
    >{
      state.current.overlay ? state.current.overlay : null
    }</ReactCSSTransitionGroup>
    { showInspector ? <Inspector /> : null }
  </>
}

// export default function SyncPlayer({ play }: Props) {
//   const [initial, setInitial] = useState<string | Loading>(Loading)
//   const playerState = useMemo(() => state<string>('player.state'), [])

//   useEffect(() => {
//     const current = playerState.value
//     if (current !== Loading) return setInitial(current)
//     console.log('current=', current)
//     const disconnect = playerState(beat => {
//       console.log('got beat=', beat)
//       setInitial(beat)
//       disconnect()
//     })
//     return disconnect
//   }, [playerState])
//   if (initial === Loading) return <h1>⌚️</h1>
//   return <Player play={play} playerState={playerState} initialBeat={initial as string} />
// }