import createHub, { Hub } from './hub'
import createPeer, { Connection, Data, ConnectionMethods, PeerMessage, PeerMethods } from './peer'
import createEvent, { Event } from './event'
import { Message } from './message';

type ClientMethods = PeerMethods & {
  emit: (message: Message, data?: Data) => void
  connect: Hub
}

type ClientInterface = Event<PeerMessage> & PeerMethods & {
  emit: (message: Message, data?: Data) => void;
  connect: Hub;
}

const Client = (connect: Hub) => createEvent<PeerMessage, ClientMethods>((emit, from) => ({
  send(message: Message, data?: Data) {},
  emit(message: Message, data?: Data) {
    // console.log('Client emit', message, data)
    emit({
      from,
      message,
      data
    })
  },
  connect
}))

type Disconnect = {
  disconnect(): void
}

const ServerConnection = (url=`ws://${location.host}/__data__/`) =>
  createEvent<Message, ConnectionMethods & Disconnect>(emit => {
    let sock: WebSocket = null
    let reconnectWaitMs = 50
    let pending = null

    connect()

    return {
      sendMessage, sendData, disconnect
    }

    function disconnect() {
      sock.onclose = null
      sock.close()
      sock = null
    }

    function sendMessage(msg: Message) {
      if (!msg) throw new Error('Message cannot be null')
      sock && sock.send(JSON.stringify(msg))
    }

    function sendData(data: Data) {
      sock.send(data)
    }
  
    function connect() {
      console.log('Connecting to', url, '...')
      pending = null
      if (sock && (
        sock.readyState === WebSocket.OPEN ||
        sock.readyState === WebSocket.CONNECTING))
        return
      sock = null
      const s = new WebSocket(url)
      s.binaryType = 'arraybuffer'
      s.onopen = () => {
        console.log('Connected.')
        reconnectWaitMs = 50
        sock = s
      }
      s.onclose = reconnect
      s.onerror = reconnect
      s.onmessage = onMessage
    }
  
    function reconnect(event) {
      console.error(event, 'retry in', reconnectWaitMs, 'ms')
      pending = pending || setTimeout(connect, reconnectWaitMs *= 2)
    }
  
    function onMessage(ev: MessageEvent) {
      emit(ev.data)
    }
  })

function createClient(): ClientInterface {
  if ((window as any).__Client) return (window as any).__Client
  const connect = createHub()
  const server = (window as any).__Server || ((window as any).__Server = ServerConnection())
  connect(createPeer(server), 'Server connection')
  const client = Client(connect)
  connect(client, 'Writer')
  ;(window as any).__Client = client
  return client
}
  
export default createClient()
