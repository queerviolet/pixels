const debug = require('debug')('@lumen8/data/files')
import { Peer, PeerMethods, PeerMessage, Data } from './peer'
import { Message, Location } from './message'
import { relative, normalize, resolve, join, dirname, basename } from 'path'
import { watch } from 'chokidar'

import createEvent from './event'
import { createWriteStream, WriteStream, mkdirSync } from 'fs';

interface Options {
  dataDir: string
  tickleProtectionMs: number
}

export default ({ dataDir='.', tickleProtectionMs = 200 }: Partial<Options>): Peer =>
  createEvent<PeerMessage, PeerMethods>((emit, self) => {
    debug('Starting files peer...')
    dataDir = resolve(process.cwd(), dataDir)
    debug('  dataDir:', dataDir)
    debug('  tickleProtection:', tickleProtectionMs, 'ms')
    
    watch(dataDir, { depth: 0 }).on('raw', onFSChange)

    const lastTouched: { [path: string]: number } = {}
    const writers: { [path: string]: WriteStream } = {}

    return { send }

    function send(msg: Message, data?: Data) {
      if (msg.type === 'data...') {
        const { layout } = msg
        let i = layout.length; while (i --> 0) {
          const l = layout[i]
          const path = filePathFromLocation(l)
          if (!path) {
            console.error('Invalid location:', l)
            continue
          }
          writerFor(path).write(data)
          lastTouched[path] = Date.now()
        }
      }
    }

    function writerFor(path: string) {
      if (!writers[path]) {
        mkdirSync(dirname(path), { recursive: true })
        writers[path] = createWriteStream(path, { flags: 'a' })
      }
      return writers[path]
    }

    function onFSChange(_type: string, path: string, _details: any) {
      if (Date.now() - (lastTouched[path] || 0) > tickleProtectionMs) {
        const message = withLocation(path, { type: 'changed' as 'changed' })
        if (!message) return
        debug('Closing', path)
        writers[path] && writers[path].close()
        writers[path] = null
        emit({
          from: self,
          message
        })
      }
    }

    function filePathFromLocation(location: Location): string | null {
      const node = join(dataDir, location.node, location.path.join('.'))
      if (!node.startsWith(dataDir)) return null
    }

    function withLocation<M>(path: string, message: M): M & Location {
      const relPath = relative(dataDir, path)
      if (relPath.startsWith('..')) return
      const node = dirname(path)
      const structPath = basename(path).split('.')
      return { ...message, node, path: structPath }
    }
  })

  