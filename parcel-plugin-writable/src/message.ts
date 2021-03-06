import { Descriptor, Field, parseField } from './struct'

export type Location = {
  node: string
  column: string[]
}

export type Message = DataMessage | SourceMessage | StateMessage

export type DataMessage = { type: 'read?' } & Location |
  { type: 'truncate.' } & Location |
  { type: 'changed' } & Location |
  { type: 'data...'} & Location

export type SourceMessage =
  { type: 'read source?', file: string } |
  { type: 'source', file: string, content: string }

export type StateMessage =
  { type: 'read state?', key: string } |
  { type: 'state', key: string, value: any }

export function parse(input: string): Message {
  const message: Message = JSON.parse(input)
  // if (message && message.type === 'data...') {
  //   message.layout = (message.layout as (Location & Descriptor)[])
  //     .map(parseField)
  // }
  return message
}