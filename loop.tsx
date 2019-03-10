import * as React from 'react'
const { useState, useRef, useEffect, useContext, useMemo, isValidElement } = React

import { ReactComponentLike, symbol, bool } from 'prop-types';
import { forwardRef, MutableRefObject } from 'react'
import createEvent, { Event, Emitter } from './event'

const Context = React.createContext<CellContext>(null)

type HasEvaluator = {
  evaluator: Function
}

type Pattern = {
  type: Partial<HasEvaluator> | React.ReactElement['type']
  props: any
}

interface CellContext {
  (pattern: any): Cell
  onDidEvaluate: Event<Set<Cell>>
  invalidate(cell: Cell): void
  invalidateAll(cells: Iterable<Cell>): void
  render(): React.ReactElement[]
  run(): void
}


const statDelta = (now, prev) => ({
  batch: now.batch - prev.batch,
  evaluations: now.evaluations - prev.evaluations,
})
export default function Run({
  loop, children
}: { loop: CellContext, children?: any }) {
  const [ isReady, setIsReady ] = useState<boolean>(false)
  const [ effects, setEffects ] = useState<React.ReactElement[]>([])
  useEffect(() => {
    if (!loop) {
      throw new Error('loop must be provided to Run')
    }
    setIsReady(true)
    const stats = {
      batch: 0, evaluations: 0,
    }
    let prev = {batch: 0, evaluations: 0}
    return loop.onDidEvaluate((cells) => {
      stats.evaluations += cells.size
      ++stats.batch
      const effects = loop.render()
      if (stats.batch % 2 === 0) {
        console.table({delta: statDelta(stats, prev), current: stats, prev})
        prev = {...stats}
      }
      setEffects(effects)
    })
  }, [loop])

  if (!isReady) return null

  return <Context.Provider value={loop}>
    {children}
    {effects}
  </Context.Provider>
}

type Cells = Map<string | symbol, Cell>

export function createLoop(): CellContext {
  const cells: Cells = new Map
  const dirty = new Set<Cell>()

  let didEvaluate: Emitter<Set<Cell>> | null = null
  const onDidEvaluate = createEvent(emit => { didEvaluate = emit })

  const get: any = (pattern: any) => {
    const key = asKey(pattern)
    if (!cells.has(key)) {
      const cell = new Cell(get, pattern)
      cells.set(key, cell)
      invalidate(cell)
      return cell
    }
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

  function run() {
    while (dirty.size) {      
      const cells = new Set<Cell>(dirty.values())
      //  console.log('%c Beginning evaluation of %s cells', 'color: red', cells.size)
      if (!cells.size) return
      dirty.clear()
      let current = null
      try {
        for (const cell of cells) {
          current = cell
          cell.evaluate()
        }
      } catch (error) {
        console.error(new EvaluationError(error, current))
      }
      // console.log('%c did evaluate %s cells', 'color: red', cells.size)
      didEvaluate(cells)
    }
  }

  return Object.assign(get, {
    onDidEvaluate,
    cells, dirty, render, invalidate, invalidateAll, run })
}

class EvaluationError extends Error {
  constructor(public error: Error, public cell: Cell) {
    super(`Evaluation error: ${error.message} in cell ${String(cell.key)}`)
  }
}


const withEvaluator: <T>(evaluator: Evaluator, input: T) => T & HasEvaluator =
  (evaluator, input) => {
    (input as any).evaluator = evaluator
    return input as typeof input & HasEvaluator
  }

export const useRead = (input: React.ReactElement) => {
  const $ = useContext(Context)
  const [value, setValue] = useState($ && $(input))
  useEffect(() => {    
    const cell = $ && $(input)
    return $ && $.onDidEvaluate(changes =>
      changes.has(cell) && setValue(cell))
  }, [input])
  return value
}

type Renderer = (cell: Cell) => React.ReactElement
const None: Renderer = () => null

export const Evaluate: <P>(evaluator: Evaluator, render?: Renderer) => (props: P) => React.ReactElement
  = (evaluator, render=None) => {
    const Component = withEvaluator(
      evaluator,
      forwardRef((props: any, ref: React.Ref<any>) => {
        const $ = useContext(Context)
        const cell = $(<Component {...props} />)
        React.useImperativeHandle(ref, () => cell, [cell])
        return render(cell)
      })
    )
    Component.displayName = evaluator.name
    return Component
  }

interface WithValue { value: any }
interface WithInput { input: Pattern }
export const Value = Evaluate<WithValue>(({ value }) => value)

export function Print({ input }) {
  const value = useRead(input).value
  return value || 'no value'
}

type Evaluator = (inputs: any, cell: Cell) => any

class Effect<T=any> {
  public value: T

  constructor(
    effect: React.ReactElement,
    public cell: Cell
    ) {
    if (!effect.key)
      throw new Error('Effects must have keys')
    this.effect = effect
  }

  write = (value: T) => {
    this.value = value
    this.cell.invalidate()
  }

  set effect(effect: React.ReactElement) {
    this.rendition = createRendition<T>(effect, this.cell.key, this.write)
  }

  get effect() {
    return this.rendition
  }

  public rendition: React.ReactElement
}

function createRendition<T>(effect: React.ReactElement, cellKey: string,  write: (value: T) => void) {
  const key = `${cellKey}/${effect.key}`
  if (effect.type instanceof React.Component || typeof effect.type === 'string') {
    return React.cloneElement(effect, {key, ref: write})
  }
  return React.cloneElement(effect, {key, _: write})
}

const NilEvaluator = (_args, cell) => cell.value

const getEvaluator = (pattern: any): Evaluator =>
  (pattern && pattern.type && pattern.type.evaluator) || NilEvaluator

export class Cell {
  constructor(public readonly context: CellContext,
    public readonly pattern: Pattern,
    public readonly evaluator: Evaluator = getEvaluator(pattern)) { }

  public readonly key: string = asKey(this.pattern)
  public value: any = null
  public effects: { [key: string]: Effect } = {}

  get rendition(): React.ReactElement[] {
    const effects = Object.values(this.effects)
    if (!effects.length) return null
    return effects.map(e => e.rendition).filter(Boolean)
  }

  public addOutput(cell: Cell) {
    this.outputs[cell.key as string] = cell
  }

  private outputs: { [key: string]: Cell } = {}

  public read(pattern: Pattern | string | symbol) {
    const target = this.context(pattern)
    target.addOutput(this)
    return target
  }

  public effect<T>(effect: Effect<T>['effect']): T {
    const { effects } = this
    const existing = effects[effect.key]
    if (!existing) {
      effects[effect.key] = new Effect(effect, this)
    } else {
      existing.effect = effect
    }
    return effects[effect.key].value
  }

  public invalidate() {
    this.context.invalidate(this)
  }

  public write = (value: any) => {
    this.value = value
    this.context.invalidateAll(Object.values(this.outputs))
  }

  public evaluate() {
    this.value = this.evaluator(this.pattern.props, this)
    this.context.invalidateAll(Object.values(this.outputs))
  }  
}

const asKey = (key: any) =>
  typeof key === 'string'
    ? key    
    :
  asKeyPart(key)
   

const asKeyPart = (part: any) =>
  typeof part === 'symbol' || typeof part === 'function'
    ? repr(part)
    :
    React.isValidElement(part)
    ? repr((part.type as any).evaluator || part.type) + asKey(part.props)
    :
    (part && typeof part === 'object')
    ? '(' +
      Object.keys(part).map(
        k => `${JSON.stringify(k)}: ${asKeyPart(part[k])}`
      ).join(', ') +
      ')'
    :
    JSON.stringify(part)


const REPR = Symbol('Cached JSON representation of constant values')
const symMap = new Map<symbol, string>()
let nextId = 0
const repr = (key: any) => {
  if (typeof key === 'string') return JSON.stringify(key)
  if (typeof key === 'symbol') {
    if (!symMap.has(key))
      symMap.set(key, `[${nextId++}/${String(key)}]`)
    return symMap.get(key)
  }
  if (key[REPR]) return key[REPR]
  return key[REPR] = `[${nextId++}/Function(${key.displayName || key.name})]`
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