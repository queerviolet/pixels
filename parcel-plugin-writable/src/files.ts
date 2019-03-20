const debug = require('debug')('@lumen8/data/files')
import { Peer, PeerMethods, PeerMessage, Data } from './peer'
import { Message, Location } from './message'
import { relative, normalize, resolve, join, dirname, basename } from 'path'
import { watch } from 'chokidar'

import createEvent from './event'
import { createWriteStream, WriteStream, mkdirSync, readFile } from 'fs';
import { byte, setBuffer, establishFrame } from './struct';

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
        const frame = establishFrame()
        setBuffer(frame, ArrayBuffer.isView(data) ? data.buffer : data)
        let i = layout.length; while (i --> 0) {
          const l = layout[i]
          const path = filePathFromLocation(l)
          if (!path) {
            console.error('Invalid location:', l)
            continue
          }
          // TODO: Write through the field descriptor
          establishFrame(l, frame)
          console.log('l=', l)
          const ary = l.array
          const buf = Buffer.from(ary.buffer.slice(ary.byteOffset, ary.byteLength))        
          writerFor(path).write(buf)
          console.log('wrote', path, buf.byteLength, 'bytes')
          lastTouched[path] = Date.now()
        }
      }
      if (msg.type === 'read?') {
        const path = filePathFromLocation(msg)
        if (!path) {
          console.error('Invalid location:', msg)
          return
        }
        console.log('Reading', path)
        readFile(path, (err, data) => {          
          if (err) {
            console.error(err)
            return
          }
          console.log('Read', data.byteLength, 'bytes from', path)
          emit({
            from: self,
            message: {
              type: 'data...' as 'data...',
              layout: [
                {
                  type: 'byte',
                  node: msg.node,
                  path: msg.path,
                  byteOffset: 0,
                  byteLength: data.byteLength,
                  component: byte.component, 
                } as any
              ]
            },
            data
          })
        })
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
        writers[path] && writers[path].close()
        debug('Closed', path)
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
      return node
    }

    function withLocation<M>(path: string, message: M): M & Location {
      const relPath = relative(dataDir, path)
      if (relPath.startsWith('..')) return
      const node = dirname(path)
      const structPath = basename(path).split('.')
      return { ...message, node, path: structPath }
    }
  })

  