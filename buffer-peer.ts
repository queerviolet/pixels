const debug = require('debug')('buffer-peer')
import createEvent, { Event, Emitter } from './parcel-plugin-writable/src/event'
import { PeerMessage, PeerMethods, Data } from 'parcel-plugin-writable/src/peer'
import { Descriptor, dtype } from 'parcel-plugin-writable/src/struct'
import { Message, Location } from './parcel-plugin-writable/src/message'
import { Stream } from './stream'
import { join } from 'path'

type DataBuffers<B> = PeerMethods & {
  onChange: Event<B>
  clear(): void
}

interface BufferOps<B> {
  alloc(column: Descriptor): B
  append(buffer: B, data: Data): void
  clear(buffer: B): void
}

function filePathFromLocation(location: Location): string | null {
  return join(location.node, location.column.join('.'))
}

export const createBufferPeer = <B>(node: string, column: string[], dtype: dtype, { alloc, append, clear }: BufferOps<B>) => {
  const fieldPath = filePathFromLocation({node, column})
  let didChange
  const onChange = createEvent<B>(emit => { didChange = emit })
  const buffer = alloc(dtype)

  return createEvent<PeerMessage, DataBuffers<B>>(
    (emit, self) => {
      setTimeout(() => {
        const msg: PeerMessage = {
          from: self,
          message: {
            type: 'read?',
            node, column,
          }
        }
        emit(msg)
      }, 10)

      return { send, onChange, clear() { clear(buffer) } }
    
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
import { TextureDataStream } from './texture'

export const vertexArrayBuffer = (gl: any, node: string, column: string[], dtype: dtype) => {
  const ops: BufferOps<Stream> = {
    alloc(column: dtype) {
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
  return createBufferPeer<Stream>(node, column, dtype, ops)
}

export const textureBuffer = (gl: any, node: string, column: string[], dtype: dtype) => {
  const ops: BufferOps<TextureDataStream> = {
    alloc(column: dtype) {
      return new TextureDataStream(gl, column.component.count)
    },

    append(stream: TextureDataStream, data: Data) {
      stream.push(data)
    },

    clear(stream: TextureDataStream) {
      stream.clear()
    }
  }
  return createBufferPeer<TextureDataStream>(node, column, dtype, ops)
}


export const queueBuffer = <D extends dtype, A extends (D["ArrayType"][]) = D["ArrayType"][]>(node: string, column: string[], dtype: D) => {
  const ops: BufferOps<A> = {
    alloc(column: dtype) {
      return [] as A
    },

    append(stream: A, data: Data) {
      data = ArrayBuffer.isView(data) ? data.buffer : data
      for (let offset = 0; offset < data.byteLength; offset += dtype.byteLength) {        
        stream.push(new Float32Array(data.slice(offset, offset + dtype.byteLength)))
      }
    },

    clear(stream: A) {
      stream.splice(0, stream.length)
    }
  }
  return createBufferPeer<A>(node, column, dtype, ops)
}