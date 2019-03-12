type Field = { __atom__: 'Field' }

type vec2_f32 = { type: 'vec2_f32' }
type float32 = { type: 'f32' }

type dtype = float32 | vec2_f32

const Frame_current = Symbol('Current frame')
const Frame_buffer = Symbol('Buffer for the current frame')
const Frame_view = Symbol('Data view for current frame')
const Frame_byteOffset = Symbol('Byte offset for current frame')

const Field = Symbol('Field descriptor')
const Field_byteOffset = Symbol('Byte offset for field')
const Field_path = Symbol('Path to field')

const dtype = Symbol('dtype')
const size = Symbol('size')
const componentSize = Symbol('Size of a component in a vec or mat')

export const float32: float32 = {
  type: 'f32',
  [size]: 32 / 8,
  get value() {
    const {
      [Frame_current]: frame=this,
      [Field_byteOffset]: fieldOffset=0
    } = this
    return frame[Frame_view].getFloat32(fieldOffset + frame[Frame_byteOffset], true)
  },

  set(value: number) {
    const {
      [Frame_current]: frame=this,
      [Field_byteOffset]: fieldOffset=0,
    } = this
    frame[Frame_view].setFloat32(fieldOffset + frame[Frame_byteOffset], value, true)
  },
} as float32
float32[dtype] = float32
float32[Field] = float32
export const float = float32

export const vec2_f32: vec2_f32 = {
  type: 'vec2_f32',
  [size]: 2 * 32 / 8,
  [componentSize]: 32 / 8,
  get value() {
    const {
      [Frame_current]: frame=this,
      [Field_byteOffset]: fieldOffset=0
    } = this    
    return new Float32Array(
      frame[Frame_buffer],
      frame[Frame_byteOffset] + fieldOffset, this[size] / Float32Array.BYTES_PER_ELEMENT)
  },

  set(x: number | number[], y?: number) {
    const {
      [Frame_current]: frame=this,
      [Field_byteOffset]: fieldOffset=0,
    } = this
    if (typeof x !== 'number') { [x, y] = x }
    const offset = fieldOffset + frame[Frame_byteOffset]
    frame[Frame_view].setFloat32(offset, x, true)
    typeof y !== 'undefined' &&
      frame[Frame_view].setFloat32(offset + vec2[componentSize], y, true)
  },
} as vec2_f32
vec2_f32[dtype] = vec2_f32
vec2_f32[Field] = vec2_f32

export const vec2 = vec2_f32

interface Structure {
  readonly [field: string]: Shape
}

type Shape = Structure | dtype

const isDType = (s: any): s is dtype => !!s[dtype]

type View<S extends Shape> =
  S extends float32
    ? { readonly value: number, set(value: number): void }
    :
  S extends vec2_f32
    ? { readonly value: Float32Array,
        set([x, y]: number[]): void,
        set(x: number, y: number): void
      }
    :
  S extends Structure
    ? {
      [field in keyof S]: View<S['field']>
    }
    : void

export function view<S extends Shape>(shape: S): View<S> & Frame {
  return establishFrame(Object.create(getField(shape)))
}

const getField = (shape: any) =>
  shape [Field] ? shape [Field] : struct(shape)[Field]

export function struct<S extends Shape>(shape: S): View<S> {
  const layout = getLayout(shape)
  const { map } = layout
  console.log('Layout:', layout)
  const base = frameForwarder(map)
  base[size] = layout.byteLength
  shape[Field] = base
  base[Field] = base
  return base as View<S>
}

function frameForwarder(map: any, base={}) {
  for (const field of Object.keys(map)) {
    let descriptor = null
    Object.defineProperty(base, field, {
      get() {
        if (descriptor) return descriptor
        if (!isDType(map[field]))
          descriptor = frameForwarder(map[field])
        else
          descriptor = Object.create(map[field])
        establishFrame(descriptor, this[Frame_current])
        return descriptor
      },

      set(value: any) {
        this[field].set(value)
      }      
    })
  }
  return base
}

function establishFrame(o: any, frame=o) {
  o[Frame_current] = frame
  return o
}

interface Frame { __atom__: 'Established frame' }

function malloc(shape: Shape, count=1) {
  const buf = new ArrayBuffer(sizeof(shape) * count)
  return setOffset(setBuffer(view(shape), buf), 0)
}

function setBuffer(frame: Frame, buffer: ArrayBuffer) {
  frame [Frame_buffer] = buffer
  frame [Frame_view] = new DataView(buffer, 0)
  return frame
}

function setOffset(frame: Frame, byteOffset: number) {
  frame [Frame_byteOffset] = byteOffset
  return frame
}

function sizeof(shape: Shape): number {
  return getField(shape)[size]  
}

function getLayout(shape: Shape, layout=new Layout, path: string[]=[]) {
  if (isDType(shape)) {
    return layout.push(shape, path)
  }
  for (const field of Object.keys(shape)) {
    getLayout(shape[field], layout, [...path, field])
  }
  return layout
}

class Layout {
  public readonly fields: (Field & dtype)[] = []
  public byteLength: number = 0
  public map: any = {}

  push(type: dtype, path: string[] = []) {
    const sz = sizeof(type)
    const field = Object.create(type)
    field [Field_path] = path
    field [Field_byteOffset] = this.byteLength
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

Object.assign(window as any, {
  Frame_current,
  Frame_buffer,
  Frame_view,
  Frame_byteOffset,
  Field,
  Field_byteOffset,
  Field_path,
  dtype,
  size,
  componentSize,
  struct,
  float,
  vec2,
  view,
  setBuffer,
  setOffset,
  malloc,
})
