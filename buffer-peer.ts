const debug = require('debug')('buffer-peer')
import createEvent, { Event, Emitter } from './parcel-plugin-writable/src/event'
import { PeerMessage, PeerMethods, Data } from 'parcel-plugin-writable/src/peer'
import { Descriptor, establishFrame, setBuffer } from 'parcel-plugin-writable/src/struct'
import { Message, Location } from './parcel-plugin-writable/src/message'
import { Stream } from './buffer'
import { append } from 'parcel-plugin-writable/client';
import { join } from 'path'
import { getNodePath } from 'parcel-plugin-writable/src/node';


type DataBuffers<B> = PeerMethods & {
  get(node: Node & Descriptor): Event<B>
}

interface BufferOps<B> {
  alloc(column: Descriptor): B
  append(buffer: B, data: ArrayBufferView): void
  clear(buffer: B): void
}

export const createBufferPeer = <B>({ alloc, append, clear }: BufferOps<B>) =>
  createEvent<PeerMessage, DataBuffers<B>>(
    (emit, self) => {
      const streams: { [path: string]: B } = {}
      const events: { [path: string]: Event<B> } = {}
      const emitters: { [path: string]: Emitter<B> } = {}

      return { get, send }

      function get(field: Node & Descriptor): Event<B> {
        const path = pathOf(field)
        const buffer = bufferFor(path)
        if (!events[path]) {
          events[path] = createEvent<B>(emit => { emitters[path] = emit })          
          emit({
            from: self,
            message: {
              type: 'read?',
              node: getNodePath(field),
              path: field.path
            }
          })
        }
        return events[path]
      }

      function pathOf(node: Node & Descriptor) {
        const nodePath = getNodePath(node)
        const path = join(nodePath, node.path.join('.'))
        return path
      }

      function bufferFor(path: string): B {
        console.log('lookup buffer for', path)
        if (!streams[path]) {
          streams[path] = alloc(node)                  
        }
        return streams[path]
      }

      function send(msg: Message, data?: Data) {
        debug('Buffer peer received:', msg, data)
        if (msg.type === 'data...') {
          const { layout } = msg
          const frame = establishFrame()
          setBuffer(frame, ArrayBuffer.isView(data) ? data.buffer : data)
          let i = layout.length; while (i --> 0) {
            const l = layout[i]
            const path = filePathFromLocation(l)
            if (!path) {
              console.error('Invalid location:', l)
              continue
            }
            establishFrame(l, frame)
            append(bufferFor(l), l.array)
          }
        }
      }

      function filePathFromLocation(location: Location): string | null {
        return join(location.node, location.path.join('.'))
      }
    })

export const createVertexArrayPeer = (gl: any) =>
  createBufferPeer<Stream>({
    alloc(node: Node & Descriptor) {
      return new Stream(gl, {
        size: node.component.count,
        type: GL.FLOAT,
      })
    },

    append(buffer: )
  })