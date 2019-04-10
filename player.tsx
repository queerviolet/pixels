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
import { isTablet } from './view-mode'

import dedent from 'dedent'
import ReactMarkdown from 'react-markdown'

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

  const [notesExpanded, toggleNotes] = useReducer(
    (isExpanded: boolean) => !isExpanded, false
  )

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
    const noteEl = state.current['.noteElement']
    noteEl && noteEl.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [state])

  const next = useMemo(() => () => {
    didGesture.current = true
    return go({type: 'next'})
  }, [go])

  const prev = useMemo(() => () => {
    didGesture.current = true
    return go({type: 'prev'})
  }, [go])

  const seek = useMemo(() => (beat: Beat) => {
    didGesture.current = true
    return go({type: 'seek', beat})
  }, [go])

  useEffect(() => {
    addEventListener('keydown', onKeyDown)
    return () => removeEventListener('keydown', onKeyDown)
    function onKeyDown(e: KeyboardEvent) {
      switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
      case 'PageDown':
        return next()

      case 'ArrowLeft':
      case 'ArrowUp':
      case 'PageUp':
        return prev()

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
        const state = cell.read<State>(PresentationContext.playState)
        if (!state) return
        const { current, prev } = state

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
    {
      isTablet ?
        <>
          <div className='fixed-bar-1'>
            <button className='player-prev' onClick={prev} onTouchStart={prev}>Prev</button>
            <button className='player-next' onClick={next} onTouchStart={next}>Next</button>
          </div>
          <div
            className={`notes ${notesExpanded ? 'expanded' : ''}`}
            onClick={toggleNotes}
          >{
            Object.values(play.beats)
              .map(beat =>
                <div key={beat.id}
                  ref={e => beat['.noteElement'] = e}
                  className={`note ${state.current === beat ? 'current' : ''}`}>
                  <h1 onClick={e => { e.stopPropagation(); seek(beat) }}>{beat.id}</h1>
                  <ReactMarkdown source={dedent(beat.note || '')} />
                </div>
              )
          }</div>       
        </>
      : null    
    }
  </>
}
