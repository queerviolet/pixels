import Hub from './hub'
import createPeer, { Connection, Data, ConnectionMethods } from './peer'
import createEvent from './event'
import { Message } from './message';

function Client() {
  const connect = Hub()
  const server = createPeer(ServerConnection())
  connect(server)
  return server
}


const ServerConnection = (url=`ws://${location.host}/__data__/`): Connection =>
  createEvent<Message, ConnectionMethods>(emit => {
    let sock: WebSocket = null
    let reconnectWaitMs = 50
    let pending = null

    connect()

    return {
      sendMessage, sendData,
    }

    function sendMessage(msg: Message) {
      sock.send(JSON.stringify(msg))
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


export default Client()
