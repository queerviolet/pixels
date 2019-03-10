import * as React from 'react'
const { useState, useRef, useEffect, useContext, useMemo, isValidElement } = React

import { ReactComponentLike } from 'prop-types';
import { forwardRef } from 'react'
import createEvent, { Event, Emitter } from './event'

const Context = React.createContext<CellContext>(null)

type HasEvaluator = {
  evaluator: Function
}

type Pattern = {
  type: Partial<HasEvaluator>
  props: any
}

interface CellContext {
  (pattern: any): Cell
  onDidEvaluate: Event<Set<Cell>>
  create(pattern: Pattern, evaluator?: Evaluator): Cell
  invalidate(cell: Cell): void
  invalidateAll(cells: Iterable<Cell>): void
  render(): React.ReactElement
  run(): void
}

export default function Run({ children }: { children?: any }) {
  const loop = useMemo(() => createLoop(), [])
  ;(window as any).loop = loop
  const data = loop.render()
  useEffect(() => {
    let raf = null
    function tick() {
      raf = requestAnimationFrame(loop.run)
      loop.run()
    }
    tick()
    return () => cancelAnimationFrame(raf)
  }, [])
  return <Context.Provider value={loop}>{
    children
  }{
    data
  }</Context.Provider>
}

type Listener = (data: any) => void

type Cells = Map<string, Cell>

function createLoop(): CellContext {
  const cells: Cells = new Map
  const dirty = new Set<Cell>()

  let didEvaluate: Emitter<Set<Cell>> | null = null
  const onDidEvaluate = createEvent(emit => didEvaluate = emit)

  const get: any = (pattern: any) => {
    const key = asKey(pattern)
    if (!cells.has(key)) {
      const cell = new Cell(get, pattern)
      cells.set(key, cell)
      invalidate(cell)
      return cell
    }
    console.log('cell(', key, ')=', cells.get(key))
    return cells.get(key)
  }

  function render() {
    return [...cells.values()]
      .map(c => c.rendition)
      .filter(Boolean)
  }

  function invalidate(cell: Cell) {
    dirty.add(cell)
  }

  function invalidateAll(cells: Iterable<Cell>) {
    for (const c of cells) dirty.add(c)
  }

  function create(pattern: Pattern, evaluator: Evaluator) {
    const cell = new Cell(get, pattern, evaluator)
    return cell
  }

  function run() {
    const cells = new Set<Cell>(dirty.values())
    if (!cells.size) return
    dirty.clear()
    for (const cell of cells) {
      cell.evaluate()
    }
    didEvaluate(cells)
  }

  return Object.assign(get, {
    onDidEvaluate,
    cells, dirty, render, invalidate, invalidateAll, create, run })
}

const withEvaluator: <T>(evaluator: Evaluator, input: T) => T & HasEvaluator =
  (evaluator, input) => {
    (input as any).evaluator = evaluator
    return input as typeof input & HasEvaluator
  }

export const useRead = (input: React.ReactElement) => {
  const $ = useContext(Context)  
  const [value, setValue] = useState()
  useEffect(() => {
    const cell = $(input)
    $.onDidEvaluate(changes =>
      changes.has(cell) && setValue(cell.value))
  })
  return value
}

type Renderer = (cell: Cell) => React.ReactElement
const None: Renderer = () => null

const Evaluate: <P>(evaluator: Evaluator, render?: Renderer) => React.FunctionComponent<P>
  = (evaluator, render=None) => {
    const Component = withEvaluator(
      evaluator,
      forwardRef((props: any, ref: React.Ref<any>) => {
        const $ = useContext(Context)
        const cell = $(<Component {...props} />)
        React.useImperativeHandle(ref, () => cell, [cell])
        return render(cell)
      }))
      return Component
    }

interface WithValue { value: any }
interface WithInput { input: Pattern }
export const Value = Evaluate<WithValue>(({ value }) => value)

export function Print({ input }) {
  const value = useRead(input)
  console.log(input, '->', value)
  return value || 'no value'
}

type Evaluator = (inputs: any, cell: Cell) => any

class Effect<T=any> {
  public ref: React.Ref<T> = { current: null }

  constructor(public effect: React.ReactElement) {
    if (!effect.key)
      throw new Error('Effects must have keys')
  }
}


export class Cell {
  constructor(public readonly context: CellContext,
    public readonly pattern: Pattern,
    public readonly evaluator: Evaluator = (pattern.type as any).evaluator) { }

  public readonly key: string = asKey(this.pattern)
  public value: any = null
  public effects: { [key: string]: Effect } = {}

  get rendition(): React.ReactElement[] {
    return Object.values(this.effects)
      .map(({ effect }) => React.cloneElement(effect, { _: this }))
  }

  public addOutput(cell: Cell) {
    this.outputs[cell.key] = cell
  }

  private outputs: { [key: string]: Cell } = {}

  public read(pattern: Pattern) {
    const target = this.context(pattern)
    target.addOutput(this)
    return target
  }

  public effect<T>(effect: Effect<T>['effect']): React.Ref<T> {
    const { effects } = this
    const existing = effects[effect.key]
    if (!existing) {
      effects[effect.key] = new Effect(effect)
    } else {
      existing.effect = effect
    }
    return effects[effect.key].ref
  }

  public evaluate() {
    this.value = this.evaluator(this.pattern.props, this)
    this.context.invalidateAll(Object.values(this.outputs))
  }  
}

const asKey = (key: any) =>
  typeof key === 'string' ? key
    : JSON.stringify(toJson(key), serialize)

const REPR = Symbol('Cached JSON representation of constant values')
let nextId = 0
function serialize(key: string, value: any) {
  if (value[REPR]) return value[REPR]
  if (typeof value === 'function') {
    const name = value.displayName || value.name
    return value[REPR] = {
      type: '__function__',
      id: `${name}/${nextId++}`
    }
  }
  return value
}

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