import * as React from 'react'
import useSource from './use-source'

import { StageRect, pixelRect } from './stage'

type Props = {
  title?: string
  frame?: StageRect
  children: React.ReactChild
}

export function Panel({ title, frame=[[-5, -5], [5, 5]], children }: Props) {
  return <div className={`panel`} style={styleFromFrame(frame)}>
    <h1>{title}</h1>    
    <div className='content'>{children}</div>
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