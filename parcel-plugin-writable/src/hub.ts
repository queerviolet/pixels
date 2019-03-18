import { Peer } from './peer'
import { Unsubscribe } from 'event';

export default function Hub() {
  const peers: Peer[] = []

  return add

  function add(peer: Peer): Unsubscribe {
    peers.push(peer)
    const unsubscribe = peer(msg => {
      let i = peers.length; while (i --> 0) {
        if (peers[i] !== msg.from)
          peers[i].send(msg.message, msg.data)
      }
    })
    
    return () => {
      unsubscribe()
      const idx = peers.indexOf(peer)
      idx !== -1 && peers.splice(idx, 1)
    }
  }
}
