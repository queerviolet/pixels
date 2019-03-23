import * as React from 'react'
const { useState, useEffect, useContext } = React

import { ReactComponentLike, any } from 'prop-types'
import createEvent, { Event, Emitter } from './event'

const Context = React.createContext<CellContext>(null)

export class Pattern {
  constructor(public readonly evaluator, public readonly props) {}

  get key(): string {    
    const props = this.props || {}
    const propStr = Object.entries(props).map(
      ([k, v]) => tag(k) + ':' + tag(v)
    ).join(', ')
    const value = `${tag(this.evaluator)}(${propStr})`
    Object.defineProperty(this, 'key', { value })
    return value
  }
}

export const Seed = (evaluator: Evaluator, props: any) =>
  new Pattern(evaluator, props)

interface CellContext {
  (pattern: any, evaluator?: Evaluator): Cell
  onDidEvaluate: Event<Set<Cell>>
  invalidate(cell: Cell): void
  invalidateAll(cells?: Iterable<Cell>): void
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
      if (stats.batch % 200 === 0) {
        console.table({delta: statDelta(stats, prev), current: stats, prev})
        prev = {...stats}
      }
    })
  }, [loop])

  if (!isReady) return null

  return <Context.Provider value={loop}>
    {children}
  </Context.Provider>
}

type EvalProps = {
  id?: string
  children: Evaluator
}

const isKey = (key: any) => key instanceof Pattern || typeof key === 'string'
let nextEvalId = 0
export function Eval({ id=`anonymous/${nextEvalId++}`, children }: EvalProps) {
  const loop = useContext(Context)
  loop(id, children).evaluator = children
  loop(id, children).invalidate()
  return null
}

type Cells = Map<string | symbol, Cell>

export function createLoop(): CellContext {
  const cells: Cells = new Map
  const dirty = new Set<Cell>()

  let didEvaluate: Emitter<Set<Cell>> | null = null
  const onDidEvaluate = createEvent(emit => { didEvaluate = emit })

  const get: any = (pattern: any, evaluator?: Evaluator) => {    
    if (!isKey(pattern)) return pattern
    const key = asKey(pattern)
    if (!cells.has(key)) {
      const cell = new Cell(get, pattern, evaluator)
      cells.set(key, cell)
      invalidate(cell)
      return cell
    }
    return cells.get(key)
  }

  function invalidate(cell: Cell) {
    dirty.add(cell)
  }

  function invalidateAll(cellsToInvalidate: Iterable<Cell> = cells.values()) {
    for (const c of cellsToInvalidate) dirty.add(c)
  }

  function run(now=performance.now()) {
    const deferred = new Set<Cell>()
    while (dirty.size) {      
      const cells = new Set<Cell>(dirty.values())
      //  console.log('%c Beginning evaluation of %s cells', 'color: red', cells.size)
      if (!cells.size) return
      dirty.clear()
      let current = null
      try {
        for (const cell of cells) {
          current = cell
          if (cell.lastEvaluatedAt === now) {
            deferred.add(cell)
            continue
          }
          cell.evaluate()
          cell.lastEvaluatedAt = now
        }
      } catch (error) {
        console.error(new EvaluationError(error, current))
        console.error(error)
      }
      // console.log('%c did evaluate %s cells', 'color: red', cells.size)
      didEvaluate(cells)
    }
    if (deferred.size) {
      // console.log('Deferred processing of', deferred.size, 'cells')
      deferred.forEach(cell => dirty.add(cell))
    }
  }

  return Object.assign(get, {
    onDidEvaluate,
    cells, dirty, invalidate, invalidateAll, run })
}

class EvaluationError extends Error {
  constructor(public error: Error, public cell: Cell) {
    super(`Evaluation error: ${error.message} in cell ${String(cell.key)}`)
  }
}


// const withEvaluator: <T>(evaluator: Evaluator, input: T) => T & HasEvaluator =
//   (evaluator, input) => {
//     (input as any).evaluator = evaluator
//     return input as typeof input & HasEvaluator
//   }

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

// export const Evaluate: <P>(evaluator: Evaluator, render?: Renderer) => (props: P) => React.ReactElement
//   = (evaluator, render=None) => {
//     const Component = withEvaluator(
//       evaluator,
//       forwardRef((props: any, ref: React.Ref<any>) => {
//         const $ = useContext(Context)
//         const cell = $(<Component {...props} />)
//         React.useImperativeHandle(ref, () => cell, [cell])
//         return render(cell)
//       })
//     )
//     Component.displayName = evaluator.name
//     return Component
//   }

// interface WithValue { value: any }
// interface WithInput { input: Pattern }
// export const Value = Evaluate<WithValue>(({ value }) => value)

// export function Print({ input }) {
//   const value = useRead(input).value
//   console.log(input, '->',  value)
//   return value || 'no value'
// }

type Evaluator = (inputs: any, cell: Cell) => any
type Disposer<T> = (value: T) => void
type Writer<T> = (value: T) => void
type Effector<T> = (write: Writer<T>, current: T) => Disposer<T> | void

class Effect<T=any> {
  public value: T
  public _dispose: Disposer<T> | void = null
  public _deps: any[] = null

  constructor(
    public key: string,
    public cell: Cell
    ) {}

  write = (value: T) => {
    this.value = value
    this.cell.invalidate()
  }

  update(effector: Effector<T>, deps?: any[]) {
    if (this.needsUpdate(deps)) {
      this.dispose()
      this._dispose = effector(this.write, this.value)
    }
    this._deps = deps
  }

  needsUpdate(params?: any[]) {
    const { _deps } = this
    if (!params) return true
    if (params && !_deps) return true
    if (_deps.length !== params.length) return true
    let i = params.length; while (i --> 0) {
      if (_deps[i] !== params[i]) return true
    }
    return false
  }

  dispose() {
    if (this._dispose) {
      this._dispose(this.value)      
      this._dispose = null
    }
  }
}

const NilEvaluator = (_args, cell) => cell.value

const getEvaluator = (pattern: any): Evaluator =>
  (pattern && pattern.evaluator) || NilEvaluator

export class Cell {
  constructor(public readonly context: CellContext,
    public readonly pattern: Pattern,
    public evaluator: Evaluator = getEvaluator(pattern)) { }

  public readonly key: string = asKey(this.pattern)
  public value: any = null
  public effects: { [key: string]: Effect } = {}
  public lastEvaluatedAt = -1

  public addOutput(cell: Cell) {
    this.outputs[cell.key as string] = cell
  }

  private outputs: { [key: string]: Cell } = {}

  public read(pattern: any): any {
    return this.get(pattern).value
  }

  public get(pattern: any): Cell {
    const target = this.context(pattern)
    target.addOutput(this)
    return target
  }

  public effect<T>(key: string, effector: Effector<T>, deps?: any[]): T {
    const { effects } = this
    const existing = effects[key]
    if (!existing) {
      effects[key] = new Effect(key, this)
    }
    const effect = effects[key]
    effect.update(effector, deps)
    return effect.value
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

console.log('Context:', Context)
export const isContext = (c: any): c is React.Context<any> =>
  c.$$typeof === (Context as any).$$typeof

const asKey = (key: any) =>
  typeof key === 'string'
    ? key    
    :
  key instanceof Pattern
    ?
  key.key
    :
  asKeyPart(key)


const tagMap = new WeakMap<any, string>()
const tag = (key: any): string => {
  if (typeof key === 'string') return JSON.stringify(key)
  if (key instanceof Pattern) return key.key
  if (key === null) return 'null'
  if (key === undefined) return 'undefined'
  if (typeof key === 'symbol') {
    if (!symMap.has(key))
      symMap.set(key, `[${nextId++}/${String(key)}]`)
    return symMap.get(key)
  }  
  if (tagMap.has(key)) return tagMap.get(key)
  const keyString = `[${nextId++}/${typeof key}(${key.displayName || key.name || (key.constructor && key.constructor.name)})]`
  tagMap.set(key, keyString)
  return keyString
}
  
   
const asKeyPart = (part: any) =>
  typeof part === 'symbol' || typeof part === 'function'
    ? repr(part)
    :
  isContext(part)
    ? repr(part, 'Context')
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
const repr = (key: any, kind='Function') => {
  if (typeof key === 'string') return JSON.stringify(key)
  if (typeof key === 'symbol') {
    if (!symMap.has(key))
      symMap.set(key, `[${nextId++}/${String(key)}]`)
    return symMap.get(key)
  }  
  if (key[REPR]) return key[REPR]
  return key[REPR] = `[${nextId++}/${kind}(${key.displayName || key.name})]`
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