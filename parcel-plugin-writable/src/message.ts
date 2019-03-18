import { Descriptor, Field, parseField } from './struct'

export type Location = {
  node: string
  path: string[]
}

export type Message =
  { type: 'read?' } & Location |
  { type: 'truncate.' } & Location |
  { type: 'changed' } & Location |
  DataMessage

export type DataMessage = { 
  type: 'data...'
  layout: (Location & Field)[]
}

export function parse(input: string): Message {
  const message: Message = JSON.parse(input)
  if (message.type === 'data...') {
    message.layout = (message.layout as (Location & Descriptor)[])
      .map(parseField)
  }
  return message
}