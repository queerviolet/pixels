import { Unsubscribable } from 'rxjs'

export type Message = Append | Clear

export interface Append {
  type: 'append'
  data: Uint8Array | ArrayBuffer
}

export interface Clear {
  type: 'clear'
}

export type Schema = {
  [key: string]: any
}

export type Shape<S> =
  S extends (node: Node, read: Read) => infer R
    ? R
    :
  S extends Schema
    ? { [key in keyof S]: Shape<S[key]> }
    :
    void

export type Data = ArrayBuffer | ArrayBufferView | number
export type Read = (reader: (msg: Message) => void) => Unsubscribable

export type Adapter<T> = (node: Node, read: Read) => T
export interface Node {
  (child: string): Node
  (push: Data): Node
  <T>(adapter: Adapter<T>): T
  <S extends Schema>(schema: S): Shape<S>
}

export const path: string
declare const node: Node
export default node