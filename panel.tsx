import * as React from 'react'
import { basename } from 'path'
import useSource from './use-source'

export function Panel({ file }) {
  const name = basename(file)
  const src = useSource(file)

  return <div className={`panel ${src ? 'loaded' : ''}`}>
    <h1>{name}</h1>    
    <code>{src}</code>
  </div>
}