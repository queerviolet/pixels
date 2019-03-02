const clients: { [path: string]: Client } = {}

import IsObservable from 'symbol-observable'
import { Observable, Observer } from 'rxjs'

export default class Client {  
  static for(path: string) {
    return clients[path] || (clients[path] = new Client(path))
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
  private readonly queue: any = []
  private data: ArrayBuffer = new ArrayBuffer(0)
  private observers: Observer<any>[] = []

  public [IsObservable]() {
    return Observable.create((s: Observer<any>) => {
      if (this.ready) s.next(this.data)
      this.observers.push(s)
      return () => {
        const {observers} = this
        const idx = this.observers.indexOf(s)
        idx >= 0 && observers.splice(idx, 1)
      }
    })
  }

  public get value() {
    return this[IsObservable]()
  }

  public push(data: ArrayBuffer) {
    if (!this.ready) return
    this.setValue(concat(this.data, data))
    this.sock.send(data)
  }

  public set(value: any) {
    const str = JSON.stringify(value)
    this.setValue(str)
    this.sock.send(str)
  }

  private setValue(data: any) {    
    this.data = data
    this.observers.forEach(o => o.next(data))
  }

  onMessage = (mev: MessageEvent) => {
    console.log(mev)
    this.ready = true
    if (mev.data instanceof ArrayBuffer) {
      this.setValue(concat(this.data, mev.data))
    }
    if (typeof mev.data === 'string') {
      this.setValue(JSON.parse(mev.data))
    }
  }

  onError = (eev: ErrorEvent) => {
    this.ready = false
    this.observers.forEach(o => o.complete())
    this.observers = []
  }

  onClose = (clev: CloseEvent) => {}
}

import { TextEncoder } from 'text-encoding'
const encoder = new TextEncoder()


function concat(a: ArrayBuffer | string, b: ArrayBuffer): ArrayBuffer {
  if (typeof a === 'string') {
    a = encoder.encode(a).buffer
  }
  const out = new Uint8Array(a.byteLength + b.byteLength)
  out.set(new Uint8Array(a))
  out.set(new Uint8Array(b), a.byteLength)
  return out
}