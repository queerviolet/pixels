import * as React from 'react'
const { useState, useRef, useEffect, useContext, useMemo, isValidElement } = React

import { Map } from 'immutable'
import { listeners } from 'cluster';
import { ReactComponentLike } from 'prop-types';

const Context = React.createContext<CellContext>(null)
type CellContext = (pattern: any) => Cell

export default function Run({ children }: { children?: any }) {
  const loop = useLoop()
  const data = loop.render()  
  return <Context.Provider value={loop}>{
    children
  }{
    data
  }</Context.Provider>
}

type Listener = (data: any) => void

function useLoop() {
  const [cells, setCells] = useState(Map<string, Cell>())
  const root = useRef(cells)
  root.current = cells
  ;(window as any).cells = root
  return useMemo(() => {    
    const get = (pattern: any) => {
      const cells = root.current
      const key = asKey(pattern)
      if (!cells.has(key)) {
        const cell = new Cell(pattern)
        const newCells = cells.set(key, cell)
        setCells(newCells)
        root.current = newCells
        return cell
      }
      return cells.get(key)
    }
    get.root = root
    get.render = () => [
      ...root.current.map(cell => cell.rendition).values()
    ]
    return get
  }, [root, setCells])
}

export function useRead(input: React.ReactElement) {
  const cell = useContext(Context)
  const [state, setState] = useState(cell(input).value)
  useEffect(() => cell(input).read(update), [cell, setState])
  function update(value) {
    console.log('update read state(', toJson(input), ')=', state, value)
    setState(value)
  }
  console.log('return read state(', toJson(input), ')=', state)
  return state
}

export const Value = ({ _, value }: {_?: Cell, value: any}) => {
  console.log('Cell is', _)
  useEffect(() => _.write(value), [ _, value ])
  return null
}

export const Print = ({ input }) => {
  const value = useRead(input)
  console.log('Render print:', value)
  return value
}

export class Cell {
  constructor(public readonly evaluator: React.ReactElement) {}

  public readonly key: string = asKey(this.evaluator)
  public value: any = null
  public rendition = 
    React.cloneElement(this.evaluator, { key: this.key, _: this })

  private listeners: Listener[] = []

  read(listener: Listener) {
    const { listeners } = this
    listeners.push(listener)
    listener(this.value)
    console.log('listen', this.key, listener)
    return () => {
      console.log('detach', this.key, listener)
      const idx = listeners.indexOf(listener)
      if (idx !== -1) listeners.splice(idx, 1)
    }
  }

  write = (value: any) => {
    console.log('write', this.key, value)
    const { listeners } = this
    this.value = value
    let i = listeners.length; while (i --> 0) {
      listeners[i](value)
    }
  }
}

const asKey = (key: any) =>
  typeof key === 'string' ? key
    : JSON.stringify(toJson(key))

const toJson = (val: any) =>
  React.isValidElement(val)
    ? {
      type: toTypeJson(val.type),
      props: toPropsJson(val.props)
    }
    : val

const toTypeJson = (type: string | ReactComponentLike) =>
    typeof type === 'function'
      ? (type as any).displayName || type.name
      : type

const toPropsJson = (props: any) => {
  const json = {}
  Object.keys(props).forEach(key => {
    json[key] = toJson(props[key])
  })
  return json
}