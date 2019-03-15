import { Shape, View, malloc, hasFrame } from "./src/struct"

type Sendable = { __$Sendable__ : 'An object we can send() to the server' }

const Sendable_path = Symbol('Sendable.path: the path to write on send')
const Sendable_client = Symbol('Sendable.client: the client to write with')
const defaultClient = Client()

export const writeStream = <S extends Shape>(path: string, shape: S): View<S> & Sendable => {
  const view = hasFrame(shape) ? shape : malloc(shape)
  view [Sendable_path] = path
  view [Sendable_client] = defaultClient
  return view as any as (View<S> & Sendable)
}

function Client() {
  let sock: WebSocket = null
  let reconnectWaitMs = 50

  connect()

  function connect() {
    if (sock && (
      sock.readyState === WebSocket.OPEN ||
      sock.readyState === WebSocket.CONNECTING))
      return
    sock = null
    pending = null
    const s = new WebSocket(`ws://${location.host}/__data__`)
    s.binaryType = 'arraybuffer'
    s.onopen = () => {
      reconnectWaitMs = 50
      sock = s
    }
    s.onclose = reconnect
    s.onerror = reconnect
    s.onmessage = onMessage
  }

  let pending = null
  function reconnect(event) {
    console.error(event, 'retry in', reconnectWaitMs, 'ms')
    pending = pending || setTimeout(connect, reconnectWaitMs *= 2)
  }

  function onMessage(ev: MessageEvent) {
    if (typeof ev.data === 'string')
      return onControlMessage(JSON.parse(ev.data))
    onDataMessage(ev.data)
  }

  function onControlMessage(msg: any) {

  }

  function onDataMessage(data: ArrayBuffer) {

  }
}