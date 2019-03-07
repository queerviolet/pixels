import * as React from 'react'
const { useState, useRef, useEffect, useContext, useMemo, isValidElement } = React

import { Map } from 'immutable'
import { listeners, emit } from 'cluster';
import { ReactComponentLike } from 'prop-types';
import { EINTR } from 'constants';

const Context = React.createContext<CellContext>(null)
interface CellContext {
  (pattern: any): Cell
  enqueue(cells: Cell[]): void
}

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
        const cell = new Cell(get, pattern)
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
    get.enqueue = (cells: Iterable<Cell>) => {}
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

type Evaluator = (inputs: any, cell: Cell) => any

export class Cell {
  constructor(public readonly context: CellContext,
    public readonly pattern: React.ReactElement,
    public readonly evaluator: Evaluator = (pattern.type as any).evaluator) { }

  public readonly key: string = asKey(this.pattern)
  public value: any = null
  public rendition = 
    React.cloneElement(this.pattern, { key: this.key, _: this })

  public addOutput(cell: Cell) {
    this.outputs[cell.key] = cell
  }

  private outputs: { [key: string]: Cell } = {}

  public read(pattern: React.ReactElement) {
    const target = this.context(pattern)
    target.addOutput(this)
    return target.value
  }

  private evaluate() {
    const newVal = this.evaluator(this.pattern.props, this)
    if (newVal !== this.value) {
      this.value = newVal
      this.context.enqueue(Object.values(this.outputs))
    }
  }

  emit() {
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