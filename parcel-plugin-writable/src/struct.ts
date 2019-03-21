import { read } from "fs";

export type Field<Type=string, Data=any> = Descriptor<Type> & Accessor<Data>

export type Descriptor<T=dtype["type"]> = {
  type: T
  byteLength: number
  component: {
    byteLength: number
    count: number
  }
  path?: string[]
  byteOffset?: number
}

export type vec2_f32 = Field<'vec2', Float32Array>
export type float32 = Field<'float', number>
export type uint8 = Field<'byte', number>

export type dtype = float32 | vec2_f32 | uint8

const Contexts = Symbol('Context values for this object')

const Frame_current = Symbol('Current frame')
const Frame_buffer = Symbol('Buffer for the current frame')
const Frame_view = Symbol('Data view for current frame')
const Frame_byteOffset = Symbol('Byte offset for current frame')

export type Accessor<T> = {
  readonly value: T
  readonly array: ArrayBufferView
  set(value: T): void
  read(buffer: ArrayBuffer, offset?: number): ArrayBufferView
  ArrayType: ArrayBufferView
}
const Accessor = Symbol('Accessor for shape')

const dtype = Symbol('dtype')
const size = Symbol('size')

export const float32: float32 = {
  type: 'float',
  ArrayType: new Float32Array(0),
  byteLength: 32 / 8,
  component: {
    byteLength: 32 / 8,
    count: 1,
  },
  [size]: 32 / 8,
  get value() {
    const {
      byteOffset: fieldOffset=0
    } = this
    const frame = getFrame(this)
    return frame[Frame_view].getFloat32(fieldOffset + frame[Frame_byteOffset], true)
  },

  set(value: number) {
    const {
      byteOffset: fieldOffset=0,
    } = this
    const frame = getFrame(this)
    frame[Frame_view].setFloat32(fieldOffset + frame[Frame_byteOffset], value, true)
  },

  get array() {
    const {
      byteOffset: fieldOffset=0
    } = this
    const frame = getFrame(this)
    return new Float32Array(
      frame[Frame_buffer],
      frame[Frame_byteOffset] + fieldOffset, this.byteLength / Float32Array.BYTES_PER_ELEMENT)
  },

  read(buffer: ArrayBuffer, offset: number = 0) {
    return new Float32Array(
      buffer, offset + this.byteOffset, this.byteLength / Float32Array.BYTES_PER_ELEMENT
    )
  },

  toJSON() {
    return {
      type: 'float',
      path: this.path,
      byteOffset: this.byteOffset,
      byteLength: this.byteLength,
      component: float.component,
      node: this.node,
    }
  }
} as float32
float32[dtype] = float32
float32[Accessor] = float32
export const float = float32


export const byte: uint8 = {
  type: 'byte',
  ArrayType: new Uint8Array(0),
  byteLength: 1,
  component: {
    byteLength: 1,
    count: 1,
  },
  [size]: 1,
  get value() {
    const {
      byteOffset: fieldOffset=0
    } = this
    const frame = getFrame(this)
    return frame[Frame_view].getUint8(fieldOffset + frame[Frame_byteOffset], true)
  },

  set(value: number) {
    const {
      byteOffset: fieldOffset=0,
    } = this
    const frame = getFrame(this)
    frame[Frame_view].setUint8(fieldOffset + frame[Frame_byteOffset], value, true)
  },

  get array() {
    const {
      byteOffset: fieldOffset=0
    } = this
    const frame = getFrame(this)
    return new Uint8Array(
      frame[Frame_buffer],
      frame[Frame_byteOffset] + fieldOffset, this.byteLength)
  },

  read(buffer: ArrayBuffer, offset: number = 0) {
    return new Uint8Array(
      buffer, offset + this.byteOffset, this.byteLength
    )
  },

  toJSON() {
    return {
      type: 'byte',
      path: this.path,
      byteOffset: this.byteOffset,
      byteLength: this.byteLength,
      component: byte.component,
      node: this.node
    }
  }
} as uint8
byte[dtype] = byte
byte[Accessor] = byte


export const vec2_f32: vec2_f32 = {
  type: 'vec2',
  ArrayType: new Float32Array(0),
  byteLength: 2 * 32 / 8,
  [size]: 2 * 32 / 8,
  component: {
    byteLength: 32 / 8,
    count: 2,
  },
  get value() {
    const {
      byteOffset: fieldOffset=0
    } = this
    const frame = getFrame(this)
    return new Float32Array(
      frame[Frame_buffer],
      frame[Frame_byteOffset] + fieldOffset, this.byteLength / Float32Array.BYTES_PER_ELEMENT)
  },

  read(buffer: ArrayBuffer, offset: number = 0) {
    return new Float32Array(
      buffer, offset + this.byteOffset,
      this.byteLength / Float32Array.BYTES_PER_ELEMENT
    )
  },

  get array() {
    return this.value
  },

  set(x: number | number[], y?: number) {
    const {
      byteOffset: fieldOffset=0,
      component,
    } = this
    const frame = getFrame(this)
    const view: DataView = frame[Frame_view]
    if (typeof x !== 'number') { [x, y] = x }
    const offset = fieldOffset + frame[Frame_byteOffset]
    view.setFloat32(offset, x, true)
    typeof y !== 'undefined' &&
      view.setFloat32(offset + component.byteLength, y, true)
  },
  toJSON() {
    return {
      type: 'vec2',
      path: this.path,
      byteOffset: this.byteOffset,
      byteLength: this.byteLength,
      component: vec2.component,
      node: this.node,
    }
  }
} as any as vec2_f32
vec2_f32[dtype] = vec2_f32
vec2_f32[Accessor] = vec2_f32

export const vec2 = vec2_f32

export interface Structure {
  [field: string]: Shape
}

export type Shape = Structure | dtype

export const isDType = (s: any): s is dtype => !!s[dtype]

export type View<S> = S extends Descriptor
  ? S
  : {
    [k in keyof S]: View<S[k]> & number
  }

export function view<S extends Shape>(shape: S): View<S> & Frame {
  return establishFrame(Object.create(getAccessor(shape)))
}

/**
 * Contexts are passed down implicitly from the root of a structure
 * towards its leaves. For instance, information about the currently
 * bound buffer and the offset of the current struct within it is
 * passed through the `Frame_current` context. 
 */

/**
 * Return the value for context `id` in object `d`.
 */
export const getContext = (d: any, id: symbol) =>
  d[Contexts] && d[Contexts][id]

/**
 * Set the value for context `id` in object `d`.
 */
export const setContext = <T, C={}>(d: T, id: symbol, value: any): T & C => {
  d[Contexts] = d[Contexts] || {}
  d[Contexts][id] = value
  return d as T & C
}

/**
 * Return true iff d is bound to a frame, allowing reads
 * and writes to succeed.
 */
export const hasFrame = (d: any) => !!getFrame(d)
export const getFrame = (d: any) => getContext(d, Frame_current)

const getAccessor = (shape: any) =>
  shape [Accessor] ? shape [Accessor] : struct(shape)[Accessor]

export function struct<S extends Shape>(shape: S): S {
  const layout = getLayout(shape)
  const { map } = layout  
  const base = frameForwarder(map)
  base[size] = layout.byteLength
  shape[Accessor] = base
  base[Accessor] = base
  return base
}

function frameForwarder<S extends Shape>(map: S, base=establishContext<S>()): S {
  for (const field of Object.keys(map)) {
    let descriptor = null
    Object.defineProperty(base, field, {
      get() {
        if (descriptor) return descriptor
        if (!isDType(map[field]))
          descriptor = frameForwarder(map[field])
        else
          descriptor = Object.create(map[field])          
        const newContexts = Object.create(this[Contexts])
        descriptor [Contexts] = Object.assign(newContexts, descriptor[Contexts])
        return descriptor
      },

      enumerable: true,

      set(value: any) {
        this[field].set(value)
      }
    })
  }
  return base
}

export function establishContext<T>(o: T={} as T): T {
  o[Contexts] = o[Contexts] || {}
  return o
}

export function establishFrame<T>(o?: T, frame=o || {}): T & Frame {
  o = establishContext((o || frame) as T)
  return setContext<T, Frame>(o, Frame_current, frame)
}

export interface Frame { __$Frame__ : 'Established frame' }

export function malloc<S extends Shape>(shape: S, count=1): S & Frame {
  const buf = new ArrayBuffer(sizeof(shape) * count)  
  return setOffset(setBuffer(view(shape), buf), 0) as S & Frame
}

export function setBuffer(target: Frame, buffer: ArrayBuffer) {
  const frame = target[Contexts][Frame_current]
  frame [Frame_buffer] = buffer
  frame [Frame_view] = new DataView(buffer, 0)
  return frame
}

export function getBuffer(frame: Frame): ArrayBuffer {
  return frame[Contexts][Frame_current][Frame_buffer]
}

export function setOffset(frame: Frame, byteOffset: number) {
  frame[Contexts][Frame_current][Frame_byteOffset] = byteOffset
  return frame
}

export function sizeof(shape: Shape): number {
  return getAccessor(shape)[size]  
}

const cachedLayout = Symbol('Cached root layout for this Shape')
;(global as any).getLayout = getLayout
export function getLayout<S extends Shape>(shape: S, layout?: Layout<S>, path: string[]=[]): Layout<S> {
  if (!path.length && shape[cachedLayout]) {
    console.log('returning cached layout', shape[cachedLayout], 'for', shape)
    return shape[cachedLayout]
  }
  if (!layout) layout = new Layout()
  if (isDType(shape)) {
    return layout.push(shape, path)
  }
  for (const field of Object.keys(shape)) {
    getLayout(shape[field], layout, [...path, field])
  }
  if (!path.length) {
    console.log('setting cached layout')
    ;(shape as any)[cachedLayout] = layout
  }
  return layout
}

export function setLayout(target: any, layout: Layout) {
  target[cachedLayout] = layout
}

const DTYPE = { vec2, float, byte }
type DTYPE<T extends string> =
  T extends 'vec2' ? vec2_f32
  : T extends 'float' ? float32
  : T extends 'byte' ? uint8
  : any

export function parseField<
  Type extends dtype['type'] = dtype['type'],
  D extends Descriptor<Type> = Descriptor<Type>,
  Data=DTYPE<Type>,
  >(descriptor: D): Field<Type, Data> & D {
  console.log('parsing', descriptor)
  const field = Object.assign(Object.create(DTYPE[descriptor.type]), descriptor)
  console.log('parsed', descriptor, field)
  return field
}

export class Layout<S extends Shape={}> {
  public readonly fields: (Field & dtype)[] = []
  public byteLength: number = 0
  public map: S = {} as S

  push(type: dtype, path: string[] = []): Layout<S> {
    const sz = sizeof(type)
    const field = Object.create(type)
    field.path = path
    field.byteOffset = this.byteLength
    field.type = type.type
    field.component = type.component
    this.fields.push(field)
    this.byteLength += sz

    setIn(this.map, path, field)
    return this
  }
}

function setIn(obj: any, path: string[], value: any) {
  if (!path.length) return value
  const target = mkdir(obj, path.slice(0, path.length - 1))
  target[path[path.length - 1]] = value
}

function mkdir(obj: any, path: string[]) {
  const count = path.length
  for (let i = 0; i !== count; ++i) {
    const p = path[i]
    obj = typeof obj[p] !== 'undefined' ? obj[p] : (obj[p] = {})
  }
  return obj
}

// Object.assign((window || global) as any, {
//   Frame_current,
//   Frame_buffer,
//   Frame_view,
//   Frame_byteOffset,
//   Field: Accessor,
//   dtype,
//   size,
//   struct,
//   float,
//   vec2,
//   view,
//   setBuffer,
//   setOffset,
//   malloc,
// })
