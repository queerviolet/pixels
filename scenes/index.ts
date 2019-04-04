import { ReactElement } from 'react'

import dots from './dots'
import bleed from './bleed'
import { Pattern } from 'loop';

const presentation = createPresentation({
  dots,
  bleed
})

export default presentation

export interface Presentation {
  scenes: { [title: string]: Scene }
  beats: { [path: string]: Beat }
  first: Beat
  last: Beat
}

export type Navigable = {
  id: string
  prevScene?: Scene  
  nextScene?: Scene
  next?: Beat
  prev?: Beat
}

export type Scene = Navigable & {
  id: string
  beats: Beat[]
}

export type Beat = Navigable & {
  order: number
  scene: Scene
  draw: Pattern
  overlay?: ReactElement
  note?: string
}

type Script = {
  [scene: string]: {
    [beat: string]: Partial<Beat>
  }
}

function createPresentation(scenes: Script) {
  let prev = null
  let prevScene = null
  let order = 0
  const prez: Presentation = { first: null, last: null, scenes: {}, beats: {} }
  for (const sceneKey of Object.keys(scenes)) {
    const scene: Scene = {
      id: id(sceneKey),
      prev,
      prevScene,      
      beats: []
    }
    prez.scenes[scene.id] = scene
    prev && (prev.nextScene = scene)
    prevScene && (prevScene.nextScene = scene)
    for (const beatKey of Object.keys(scenes[sceneKey])) {
      const beat = scenes[sceneKey][beatKey] as Beat
      beat.id = id(sceneKey, beatKey)
      beat.order = ++order
      beat.scene = scene
      beat.prevScene = prevScene
      beat.prev = prev
      prev && (prev.next = beat)
      prevScene && (prevScene.next = beat)      
      scene.beats.push(beat)
      prez.beats[beat.id] = beat
      prez.first = prez.first || beat
      prez.last = beat
      prev = beat
    }
    prevScene = scene
  }
  return prez
}

function id(...keys: string[]) {
  return keys.map(key => key.replace(/\s+/g, '-'))
    .join('/')
}