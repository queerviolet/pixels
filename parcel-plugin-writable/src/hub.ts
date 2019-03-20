import { Peer } from './peer'
import { Unsubscribe } from './event';

export type Hub = (peer: Peer) => Unsubscribe

export default function Hub() {
  const peers: Peer[] = []

  return add

  function add(peer: Peer, note?: string): Unsubscribe {
    console.log('Add peer', '(', note, ')', peers.length, 'peers')
    peers.push(peer)
    const unsubscribe = peer(msg => {
      console.log('****message', msg)
      let i = peers.length; while (i --> 0) {
        if (peers[i] !== msg.from)
          peers[i].send(msg.message, msg.data)
        else
          console.log('Skipping peer', peer)
      }
    })
    
    return () => {
      unsubscribe()
      const idx = peers.indexOf(peer)
      idx !== -1 && peers.splice(idx, 1)
    }
  }
}
