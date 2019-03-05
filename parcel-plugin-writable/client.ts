const clients: { [path: string]: Client } = {}

import IsObservable from 'symbol-observable'
import { Observable, Observer } from 'rxjs'

export type Message = Append | Clear

interface Append {
  type: 'append'
  data: Uint8Array | ArrayBuffer
}

interface Clear {
  type: 'clear'
}

export const clear: Clear = { type: 'clear' }
export const append = (data: Uint8Array | ArrayBuffer): Append => ({
  type: 'append',
  data
})

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
    if (!this.ready) return
    this.data.push(...data)    
    this.emit(append(data))
    this.sock.send(Uint8Array.from(data))
    console.log('push', this.path, data)
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
