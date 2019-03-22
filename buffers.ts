
type WithData = {
  data: string
}

const DTYPES: { [key: string]: dtype }= { float, vec2 }

import { vertexArrayBuffer, textureBuffer, queueBuffer } from './buffer-peer'
import { Stream } from './stream'
import { Seed, Cell } from './loop'
import { dtype, float, vec2 } from 'parcel-plugin-writable/src/struct'
import { GLContext, DataContext } from './contexts'

import { dirname, basename, extname } from 'path'

type Column = {
  node: string
  column: string[]
  dtype: dtype
}
function parseColumn(src: string) {
  const node = dirname(src)
  const ext = extname(src)
  const column = basename(src, ext).split('.')
  const dtype = DTYPES[ext.slice(1)]
  return {node, column, dtype}
}

export function VertexArrayBuffer(props: WithData, cell?: Cell) {
  if (!cell) return Seed(VertexArrayBuffer, props)
  const gl = cell.read(GLContext)
  const client = cell.read(DataContext)
  const { node, column, dtype } = parseColumn(props.data)
  const key = `Vertex Array Buffer for ${props.data}`
  return cell.effect<Stream>(key, _ => {
    const listener = vertexArrayBuffer(gl, node, column, dtype)
    const unsubscribe = listener.onChange(stream => {
      _(stream)
    })
    const disconnect = client.connect(listener, 'Vertex Array Buffer')

    return stream => {
      disconnect()
      unsubscribe()
      stream && stream.clear()
    }
  }, [props.data])
}

export function QueueBuffer(props: WithData, cell?: Cell) {
  if (!cell) return Seed(QueueBuffer, props)
  const client = cell.read(DataContext)
  const { node, column, dtype } = parseColumn(props.data)
  const key = `Queue Buffer for ${props.data}`
  return cell.effect<typeof dtype.ArrayType[]>(key, _ => {
    const listener = queueBuffer(node, column, dtype)
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
  }, [props.data])
}
