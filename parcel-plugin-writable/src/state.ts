const debug = require('debug')('@lumen8/data/source')
import { Peer, PeerMethods, PeerMessage, Data } from './peer'
import { Message } from './message'

import createEvent from './event'

export default (state=new Map): Peer =>
  createEvent<PeerMessage, PeerMethods>((emit, self) => {
    debug('Starting state peer...')

    return { send }

    function send(msg: Message, _data?: Data) {
      if (msg.type === 'read state?') {
        debug('read', msg.key, '->', state.get(msg.key))
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
        debug('set', msg.key, '->', msg.value)
        state.set(msg.key, msg.value)
      }
    }
  })

  