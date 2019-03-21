const debug = require('debug')('buffer-peer')
import createEvent, { Event, Emitter } from './parcel-plugin-writable/src/event'
import { PeerMessage, PeerMethods, Data } from 'parcel-plugin-writable/src/peer'
import { Descriptor, dtype } from 'parcel-plugin-writable/src/struct'
import { Message, Location } from './parcel-plugin-writable/src/message'
import { Stream } from './buffer'
import { append } from 'parcel-plugin-writable/client';
import { join } from 'path'
import { getPath, getLocation } from 'parcel-plugin-writable/src/node';


type DataBuffers<B> = PeerMethods & {
  onChange: Event<B>
}

interface BufferOps<B> {
  alloc(column: Descriptor): B
  append(buffer: B, data: Data): void
  clear(buffer: B): void
}

function filePathFromLocation(location: Location): string | null {
  return join(location.node, location.column.join('.'))
}

export const createBufferPeer = <B>(field: Node & dtype, { alloc, append, clear }: BufferOps<B>) => {
  const fieldPath = getPath(field)
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
            ...getLocation(field)
          }
        }
        emit(msg)
      }, 10)

      return { send, onChange }
    
      function send(msg: Message, data?: Data) {
        if (msg.type === 'data...') {
          const path = filePathFromLocation(msg)
          if (path !== fieldPath) return
          append(buffer, data)
          didChange(buffer)
          return
        }
        if (msg.type === 'truncate.') {
          clear(buffer)
          didChange(buffer)
          return
        }
      }
    }
  )
}

import GL from 'luma.gl/constants'

export const vertexArrayBuffer = (gl: any, field: Node & dtype) => {
  const ops: BufferOps<Stream> = {
    alloc(column: Descriptor) {
      return new Stream(gl, {
        type: GL.FLOAT,
        size: column.component.count
      })
    },

    append(stream: Stream, data: Data) {
      stream.push(data)
    },

    clear(stream: Stream) {
      stream.clear()  
    }
  }
  return createBufferPeer<Stream>(field, ops)
}