
type WithCol = {
  node: string
  column: string[]
  dtype: string
}

const DTYPES: { [key: string]: dtype }= { float, vec2 }

import { vertexArrayBuffer, textureBuffer, queueBuffer } from './buffer-peer'
import { Stream } from './stream'
import { Seed, Cell } from './loop'
import { dtype, float, vec2 } from 'parcel-plugin-writable/src/struct'
import { GLContext, DataContext } from './contexts'

export function VertexArrayBuffer(props: WithCol, cell?: Cell) {
  if (!cell) return Seed(VertexArrayBuffer, props)
  const gl = cell.read(GLContext)
  const client = cell.read(DataContext)
  return cell.effect<Stream>('buffer', _ => {
    const listener = vertexArrayBuffer(gl, props.node, props.column, DTYPES[props.dtype])
    const unsubscribe = listener.onChange(stream => {
      _(stream)
    })
    const disconnect = client.connect(listener, 'Vertex Array Buffer')

    return stream => {
      disconnect()
      unsubscribe()
      stream && stream.clear()
    }
  }, [props.node, props.column.join('.'), props.dtype])
}

export function QueueBuffer(props: WithCol, cell?: Cell) {
  if (!cell) return Seed(QueueBuffer, props)
  const client = cell.read(DataContext)
  const dtype = DTYPES[props.dtype]
  const key = 'Queue Buffer for ' + props.node + '/' + props.column.join('.')
  return cell.effect<typeof dtype.ArrayType[]>(key, _ => {
    const listener = queueBuffer(props.node, props.column, dtype)
    const unsubscribe = listener.onChange(stream => {
      ;(stream as any).clear = listener.clear
      _(stream)
    })
    const disconnect = client.connect(listener, key)

    return () => {
      disconnect()
      unsubscribe()
      listener && listener.clear()
    }
  }, [props.node, props.column.join('.'), props.dtype])
}
