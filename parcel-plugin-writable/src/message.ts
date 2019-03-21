import { Descriptor, Field, parseField } from './struct'

export type Location = {
  node: string
  column: string[]
}

export type Message =
  { type: 'read?' } & Location |
  { type: 'truncate.' } & Location |
  { type: 'changed' } & Location |
  { type: 'data...'} & Location

export function parse(input: string): Message {
  const message: Message = JSON.parse(input)
  // if (message && message.type === 'data...') {
  //   message.layout = (message.layout as (Location & Descriptor)[])
  //     .map(parseField)
  // }
  return message
}