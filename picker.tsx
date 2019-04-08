import * as React from 'react'
import { Sampler } from './record-stroke'

type Color = [number, number, number, number] | Sampler

export default function Picker({ colors, onPick }: { colors: Color[], onPick: (c: Color) => void }) {
  return <div className='picker'>{
    colors.map(c => <div onClick={() => onPick && onPick(c)} style={toCSS(c)} />)
  }</div>
}

const toCSS = (color: Color) =>
  typeof color === 'function'
    ? toCSS(color(0, 0))
    : {
      background: `rgba(${  
        color.map((c, i) => i < 3 ? Math.round(c * 255) : i)
      })`
    }

export const asSampler = (color: Color) =>
  typeof color === 'function'
    ? color
    : () => color