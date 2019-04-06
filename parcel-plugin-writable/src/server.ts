const debug = require('debug')('@lumen8/data/server')

import { Server as HttpServer } from 'http'
import { parse as parseUrl } from 'url'
import { Server as WebsocketServer, EventEmitter } from 'ws'

import Files from './files'
import Source from './source'
import State from './state'
import createPeer, { Data, Peer, Connection, ConnectionMethods } from './peer'
import { Message } from './message'
import Hub from './hub'

export interface ServerOptions {
  dataDir: string
  sourceDir: string
  server: HttpServer
  wsPath?: string
}

export default function Server({ dataDir, sourceDir, server, wsPath='/__data__/' }: ServerOptions) {
  debug('Starting data server...')
  const wss = new WebsocketServer({ noServer: true })
  const connect = Hub()
  connect(Files({ dataDir }), 'Filesystem peer')
  console.log('adding src peer')
  connect(Source({ sourceDir }), 'Source peer')
  connect(State(), 'State peer')

  server.on('upgrade', (request, socket, head) => {
    const { pathname } = parseUrl(request.url)
    if (pathname.startsWith(wsPath)) {
      wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request)        
        const unsubscribe = connect(createPeer(ClientConnection(ws)), socket.address())
        ws.on('close', unsubscribe)
      })
    }
  })
}

import createEvent from './event'

const ClientConnection = (ws: any): Connection =>
  createEvent<Message, ConnectionMethods>(emit => {
    ws.on('message', emit)
    return {
      sendMessage, sendData,
    }

    function sendMessage(msg: Message) {      
      ws.send(JSON.stringify(msg))
    }

    function sendData(data: Data) {
      ws.send(data)
    }
  })