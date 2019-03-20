const debug = require('debug')('buffer-peer')
import createEvent, { Event, Emitter } from './parcel-plugin-writable/src/event'
import { PeerMessage, PeerMethods, Data } from 'parcel-plugin-writable/src/peer'
import { Descriptor, establishFrame, setBuffer, getFrame } from 'parcel-plugin-writable/src/struct'
import { Message, Location } from './parcel-plugin-writable/src/message'
import { Stream } from './buffer'
import { append } from 'parcel-plugin-writable/client';
import { join } from 'path'
import { getNodePath } from 'parcel-plugin-writable/src/node';


type DataBuffers<B> = PeerMethods & {
  onChange: Event<B>
}

interface BufferOps<B> {
  alloc(column: Descriptor): B
  append(buffer: B, data: ArrayBufferView): void
  clear(buffer: B): void
}

function pathOf(node: Node & Descriptor) {
  const nodePath = getNodePath(node)
  const path = join(nodePath, node.path.join('.'))
  return path
}

function filePathFromLocation(location: Location): string | null {
  console.log('location=', location)
  return join(location.node, location.path.join('.'))
}

export const createBufferPeer = <B>(field: Node & Descriptor, { alloc, append, clear }: BufferOps<B>) => {
  const fieldPath = pathOf(field)
  let didChange
  const onChange = createEvent<B>(emit => { didChange = emit })
  const buffer = alloc(field)

  return createEvent<PeerMessage, DataBuffers<B>>(
    (emit, self) => {
      setTimeout(() => {
        const msg: PeerMessage = {
          from: self,
          message: {
            type: 'read?',
            node: getNodePath(field),
            path: field.path
          }
        }
        console.log('emit read', msg)
        emit(msg)
      }, 10)

      return { send, onChange }
    
      function send(msg: Message, data?: Data) {
        debug('Buffer peer received:', msg, data)
        if (msg.type === 'data...') {
          const { layout } = msg
          let i = layout.length; while (i --> 0) {
            const desc = layout[i]
            const path = filePathFromLocation(desc)
            if (path !== fieldPath) continue
            append(buffer,
              desc.read(ArrayBuffer.isView(data) ? data.buffer : data))
            didChange(buffer)
          }          
        }
        if (msg.type === 'truncate.') {
          clear(buffer)
          didChange(buffer)
        }
      }
    }
  )
}

import GL from 'luma.gl/constants'

export const vertexArrayBuffer = (gl: any, field: Node & Descriptor) => {
  const ops: BufferOps<Stream> = {
    alloc(column: Descriptor) {
      return new Stream(gl, {
        type: GL.FLOAT,
        size: column.component.count
      })
    },

    append(stream: Stream, data: ArrayBufferView) {
      console.log('pushing', data, 'to', stream)
      stream.push(data)
    },

    clear(stream: Stream) {
      stream.clear()  
    }
  }
  return createBufferPeer<Stream>(field, ops)
}