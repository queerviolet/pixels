import * as React from 'react'
import { Sampler } from './record-stroke'

type Color = number[] | Sampler

export default function Picker({ colors, onPick }: { colors: Color[], onPick: (c: Color) => void }) {
  return <div className='picker'>{
    colors.map(c => <div key={String(c)} onClick={() => onPick && onPick(c)} style={toCSS(c)} />)
  }</div>
}

const toCSS = (color: Color) =>
  typeof color === 'function'
    ? toCSS(color(0, 0))
    :
  typeof color === 'string'
    ? { background: `url(${color})`, backgroundSize: 'cover' }
    : {
      background: `rgba(${  
        color.map((c, i) => i < 3 ? Math.round(c * 255) : i)
      })`
    }

export const asSampler = (color: Color) =>
  typeof color === 'function'
    ? color
    :
  typeof color === 'string'
    ? imageSampler(color)     
    :
    () => color

function imageSampler(src: string): Sampler {
  if (src in imageSampler) return imageSampler[src]
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const img = new Image
  img.src = src
  img.onload = () => {
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)
  }
  const sampler: Sampler = (x, y) => {
    x += 16; y += 9
    x = canvas.width * (x / 32)
    y = canvas.height * (y / 18)
    return [...ctx.getImageData(x, y, 1, 1).data].slice(0, 3).map(c => c / 255)
  }
  imageSampler[src] = sampler
  return sampler
}