import { Peer } from './peer'
import { Unsubscribe } from './event';

export type Hub = (peer: Peer, note?: string) => Unsubscribe

export default function Hub() {
  const peers: Peer[] = []

  return add

  function add(peer: Peer, note?: string): Unsubscribe {
    peers.push(peer)
    console.log('Add peer', '(', note, ')', peers.length, 'peers')
    const unsubscribe = peer(msg => {
      let i = peers.length; while (i --> 0) {
        if (peers[i] !== msg.from)
          peers[i].send(msg.message, msg.data)
      }
    })
    
    return () => {
      console.log('Remove peer', note)
      unsubscribe()
      const idx = peers.indexOf(peer)
      idx !== -1 && peers.splice(idx, 1)
    }
  }
}
