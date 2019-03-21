import { Message, Location } from './message'

// const Node_path = Symbol('Path to data node')
// const Node_column = Symbol('Column path')
const Data_message = Symbol('Data message to lead column with')

import { Shape, Frame, dtype, setLayout, getContext, getBuffer, setContext, hasFrame, malloc, getLayout, establishFrame, View } from './struct'
import defaultClient from './client'

export type Node = { dtype: dtype, __$Node__: 'A data node' }

export default function <T extends dtype>(node: string='/', column: string[], type: T): Float32Array & Node {
  // const layout = getLayout(shape)
  // layout.fields.forEach(field => { (field as any).node = path })
  // establishFrame(shape)
  // const s = malloc(shape)
  // setContext<S, Node>(s, Node_path, path)
  // setLayout(s, layout)
  // return s as View<S> & Node
  const buffer = new ArrayBuffer(type.byteLength)
  const array = type.read(buffer)
  array [Data_message] = {
    type: 'data...',
    node, column
  }
  ;(array as any).component = type.component
  ;(array as any).dtype = type
  return array as Float32Array & Node
}

export function write(column: ArrayBufferView & Node) {
  // const dataMsg = getDataMessage(node)
  // defaultClient.emit(dataMsg, getBuffer(node))
  defaultClient.emit(column[Data_message], column)
}

import { join } from 'path'
export function getPath(node: any) {
  const data = node [Data_message]
  return join(data.node, data.column.join('.'))
}

export function getLocation(node: any): Location {
  const data = getDataMessage(node)
  return { node: data.node, column: data.column }
}

export function getDataMessage(node: any): Message {
  return node [Data_message]
}

// const dataMsg = Symbol('Stored data message for node')
// const getDataMessage = (node: Node) => {
//   if (node[dataMsg]) return node[dataMsg]
//   const layout = getLayout(node as any)
//   console.log('layout=', layout)
//   const fields = []
//   const nodePath = getNodePath(node)
//   if (!nodePath) throw new Error('Node must have a path to be written')
//   for (const f of layout.fields) {    
//     fields.push({
//       ...f,
//       node: nodePath,      
//     })
//   }
//   const dMesg: DataMessage = {
//     type: 'data...',
//     layout: fields,
//   }
//   console.log('dmsg=', dMesg)
//   return node[dataMsg] = dMesg
// }
