import * as React from 'react'
import { basename } from 'path'
import useSource from './use-source'

import { StageRect, pixelRect } from './stage'

type Props = {
  file: string
  frame?: StageRect
}

export function Panel({ file, frame=[[-5, -5], [5, 5]] }: Props) {
  const name = basename(file)
  const src = useSource(file)

  return <div className={`panel ${src ? 'loaded' : ''}`} style={styleFromFrame(frame)}>
    <h1>{name}</h1>    
    <code>{src}</code>
  </div>
}

const styleFromFrame = (frame: StageRect) => {
  const style = {}
  const px = pixelRect(frame)
  for (const [key, value] of Object.entries(px)) {
    style[`--panel-${key}`] = value + 'px'
  }
  return style
}