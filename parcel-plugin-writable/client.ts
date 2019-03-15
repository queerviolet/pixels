const clients: { [path: string]: Client } = {}

import IsObservable from 'symbol-observable'
import { Observable, Observer, Unsubscribable } from 'rxjs'

import * as varModule from './var.d'
import { Node, Clear, Append, Message } from './var.d'

export const clear: Clear = { type: 'clear' }
export const append = (data: Uint8Array | ArrayBuffer): Append => ({
  type: 'append',
  data
})

import { join } from 'path'

let float = new Float32Array([0])
function setFloats(array: number[]) {
  if (float.length < array.length) {
    float = new Float32Array(array.length)    
  }
  float.set(array)
  return new Uint8Array(float.buffer, 0, array.length * Float32Array.BYTES_PER_ELEMENT)
}

let zeroes = new Uint8Array([0])
function setZeroes(byteLength: number) {
  if (zeroes.length < byteLength)
    zeroes = new Uint8Array(byteLength)
  return new Uint8Array(zeroes.buffer, 0, byteLength)
}

export interface NodeOptions {
  elementSize?: number
}

import { Schema } from './var.d'

export const createNode = (path: string, { elementSize=1 }: NodeOptions = { elementSize: 1 }): Node => {  
  function read(reader: (msg: Message) => void): Unsubscribable {
    return Client.for(path).updates.subscribe(reader)
  }
  function self(input: any) {
    if (input == null) {
      return self(setZeroes(elementSize))
    }    
    if (typeof input === 'string')
      throw new Error('String input unsupported')
    if (typeof input === 'function')
      return input(self, read)
    if (input instanceof Uint8Array) {
      path && Client.for(path).push(input)
      return self
    }
    if (typeof input === 'number') {
      path && Client.for(path).push(setFloats([input]))
      return self
    }
    if (Array.isArray(input)) { 
      path && Client.for(path).push(setFloats(input))
      return self
    }
    const buf = ArrayBuffer.isView(input)
      ? input.buffer
      :
      input instanceof ArrayBuffer
      ? input
      : null
    if (buf)
      path && Client.for(path).push(new Uint8Array(buf))
    return structWriter(self, input)
  }

  self.child = (input: string) => createNode(join(path, input))
  self.withElementSize = (elementSize: number) => createNode(path, { elementSize })

  return self
}

function structWriter(node: Node, schema: Schema) {
  const writers = {}
  let src = 'return input => {'
  Object.keys(schema).forEach((key, i) => {
    const writer = node.child(key)(schema[key])
    writers[key] = writer
    if (typeof writer === 'function')
      src += `${key} && ${key}(input && input.${key});`
    else if (typeof writer['push'] === 'function')
      src += `${key} && ${key}.push(input && input.${key});`
  })
  src += '}'
  const write = new Function(...Object.keys(writers), src)(...Object.values(writers))
  Object.keys(schema).forEach(key => write[key] = writers[key])
  return write
}

export default createNode

class Client {  
  static for(path: string) {
    if (clients[path]) {
      return clients[path]
    }
    console.log('Create client', path)
    return clients[path] = new Client(path)
  }

  constructor(public readonly path: string) {    
    const sock = new WebSocket(`ws://${location.host}/__write__/${path}`)
    sock.binaryType = 'arraybuffer'
    sock.onmessage = this.onMessage
    sock.onerror = this.onError
    sock.onclose = this.onClose
    this.sock = sock
  }

  private ready = false
  private readonly sock: WebSocket
  private data: number[] = []
  private observers: Observer<Message>[] = []

  public [IsObservable](): Observable<Message> {
    return this.updates
  }

  public get updates(): Observable<Message> {
    return Observable.create((s: Observer<Message>) => {
      if (this.ready) s.next(append(Uint8Array.from(this.data)))
      this.observers.push(s)
      return () => {
        const {observers} = this
        const idx = this.observers.indexOf(s)
        idx >= 0 && observers.splice(idx, 1)
      }
    })
  }

  public push(data: Uint8Array) {
    if (!this.ready) {
      console.error('not ready', this.path)
      return
    }
    this.data.push(...data)    
    this.emit(append(data))
    this.sock.send(Uint8Array.from(data))
    return this
  }

  private emit(data: any) {
    console.log('->', data, 'to', this.observers.length, 'observers')
    this.observers.forEach(o => o.next(data))
  }

  onMessage = (mev: MessageEvent) => {
    this.ready = true
    if (mev.data instanceof ArrayBuffer) {
      this.emit(append(mev.data))
      this.data.push(...new Uint8Array(mev.data))
      return
    }
    if (typeof mev.data === 'string' && mev.data === 'truncate') {
      this.emit(clear)
      this.data = []
    }
  }

  onError = (eev: ErrorEvent) => {
    this.ready = false
    this.observers.forEach(o => o.error(eev.error))
    this.observers = []
  }

  onClose = (clev: CloseEvent) => {
    this.ready = false
    this.observers.forEach(o => o.complete())
    this.observers = []
  }
}
