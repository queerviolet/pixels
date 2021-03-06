import { Message, parse } from './message'
import createEvent, { Event } from './event'

export interface PeerMessage {
  from: Peer
  message: Message
  data?: Data
}

export type Peer = Event<PeerMessage> & PeerMethods

export type Data = ArrayBuffer | ArrayBufferLike | ArrayBufferView

export interface ConnectionMethods {
  sendMessage(msg: Message): void
  sendData(data: Data): void
}

export type Connection = Event<string | Message | Data> & ConnectionMethods

export interface PeerMethods {
  send(message: Message, data?: Data): void
}

export default (connection: Connection): Peer =>
  createEvent<PeerMessage, PeerMethods>((emit, self) => {
    let state: Message | null = null

    const destroy = connection(
      raw => {
        typeof (raw as any).byteLength === 'number'
          ? handleData(raw as Data)
          :
        typeof raw === 'string'
          ? handleMessage(parse(raw))
          : raw
      }
    )
    return { send, destroy }
    
    function send(message: Message, data?: Data) {
      if (message.type === 'data...') {
        // if (state !== message) {
        //   state = message
        // connection.sendMessage(state)
        // }                
        connection.sendMessage(message)
        data && connection.sendData(data)
        return
      }
      connection.sendMessage(message)
    }

    function handleMessage(message: Message) {
      if (!message) return
      if (message.type === 'data...') {
        state = message
        return
      }

      emit({ from: self, message })
    }

    function handleData(data: Data) {
      if (!state) {
        console.error('Received',
          data.byteLength, 'bytes from', connection,
          'without a prior data... message')
        return
      }
      emit({
        from: self,
        message: state,
        data,
      })
    }  
  })