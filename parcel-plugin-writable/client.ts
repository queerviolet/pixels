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

const createNode = (path: string): Node => {  
  function read(reader: (msg: Message) => void): Unsubscribable {
    return Client.for(path).updates.subscribe(reader)
  }
  function self(input: any) {
    if (!input) return self
    if (typeof input === 'string')
      return createNode(join(path, input))
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
    const base = {}
    for (const key of Object.keys(input)) {
      base[key] = self(key)(input[key])
    }
    return base
  }
  return self
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
    sock.onopen = console.log
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
