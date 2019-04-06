const debug = require('debug')('@lumen8/data/source')
import { Peer, PeerMethods, PeerMessage, Data } from './peer'
import { Message } from './message'

import createEvent from './event'
import { readFile } from 'fs'

export default (state=new Map): Peer =>
  createEvent<PeerMessage, PeerMethods>((emit, self) => {
    debug('Starting state peer...')

    return { send }

    function send(msg: Message, _data?: Data) {
      if (msg.type === 'read state?') {
        return emit({
          from: self,
          message: {
            type: 'state',
            key: msg.key,
            value: state.get(msg.key),
          }
        })
      }

      if (msg.type === 'state') {
        state.set(msg.key, msg.value)
      }
    }
  })

  