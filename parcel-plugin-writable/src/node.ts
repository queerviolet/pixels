const Node_path = Symbol('Context: Path to data node')

import { Shape, Frame, setLayout, getContext, getBuffer, setContext, hasFrame, malloc, getLayout, establishFrame } from './struct'
import defaultClient from './client'
import { DataMessage } from './message';

export type Node = Frame & { __$Node__: 'A data node' }

export default function <S extends Shape>(path: string='/', shape: S): S & Node {
  const layout = getLayout(shape)
  establishFrame(shape)
  const s = malloc(shape)
  setContext<S, Node>(s, Node_path, path)
  setLayout(s, layout)
  return s as S & Node
}

export const getNodePath = (obj: any): string =>
  getContext(obj, Node_path)
  

export function write<S extends Shape>(node: S & Node) {
  const dataMsg = getDataMessage(node)
  defaultClient.send(dataMsg, getBuffer(node))
}

const dataMsg = Symbol('Stored data message for node')
const getDataMessage = (node: Node) => {
  if (node[dataMsg]) return node[dataMsg]
  const layout = getLayout(node as any)
  console.log('layout=', layout)
  const fields = []
  const nodePath = getNodePath(node)
  if (!nodePath) throw new Error('Node must have a path to be written')
  for (const f of layout.fields) {    
    fields.push({
      ...f,
      node: nodePath,      
    })
  }
  const dMesg: DataMessage = {
    type: 'data...',
    layout: fields,
  }
  console.log(JSON.stringify(dMesg))
  return node[dataMsg] = dMesg
}
