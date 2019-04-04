const debug = require('debug')('@lumen8/data/source')
import { Peer, PeerMethods, PeerMessage, Data } from './peer'
import { Message, Location } from './message'
import { relative, normalize, resolve, join, dirname, basename } from 'path'
import { watch } from 'chokidar'

import createEvent from './event'
import { createWriteStream, WriteStream, mkdirSync, readFile } from 'fs';
import { byte, setBuffer, establishFrame } from './struct';

interface Options {
  sourceDir: string
}

export default ({ sourceDir='.' }: Partial<Options>): Peer =>
  createEvent<PeerMessage, PeerMethods>((emit, self) => {
    debug('Starting source peer...')
    sourceDir = resolve(process.cwd(), sourceDir)
    debug('  sourceDir:', sourceDir)

    return { send }

    function send(msg: Message, _data?: Data) {
      if (msg.type === 'read source?') {
        const path = resolve(sourceDir, msg.file)
        if (!(path.startsWith(sourceDir))) {
          console.error('Invalid source path:', msg.file)
          return
        }
        debug('Reading source', msg.file)
        readFile(msg.file, (err, data) => {          
          if (err) {
            console.error(err)
            return
          }
          debug('Read', data.byteLength, 'bytes from', path)
          emit({
            from: self,
            message: {
              type: 'source',
              file: msg.file,
              content: data.toString('utf8')
            },
            data
          })
        })
      }
    }
  })

  