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
        const buffer = data as Buffer
        const path = filePathForLocation(msg)
        writerFor(path).write(buffer)
        lastTouched[path] = Date.now()
        // setBuffer(frame, )
        // let i = layout.length; while (i --> 0) {
        //   const l = layout[i]
        //   const path = filePathFromLocation(l)
        //   if (!path) {
        //     console.error('Invalid location:', l)
        //     continue
        //   }
        //   establishFrame(l, frame)
        //   console.log('l=', l)
        //   const ary = l.read
        //   const buf = Buffer.from(ary.buffer.slice(ary.byteOffset, ary.byteLength))        
        //   writerFor(path).write(buf)
        //   console.log('wrote', path, buf.byteLength, 'bytes')
        //   console.log('=', new Float32Array(buf.buffer))
        //   lastTouched[path] = Date.now()
        // }
      }
      if (msg.type === 'read?') {
        const path = filePathForLocation(msg)
        if (!path) {
          console.error('Invalid location:', msg)
          return
        }
        debug('Reading', path)
        readFile(path, (err, data) => {          
          if (err) {
            console.error(err)
            return
          }
          debug('Read', data.byteLength, 'bytes from', path)
          emit({
            from: self,
            message: {
              type: 'data...' as 'data...',
              node: msg.node,
              column: msg.column,
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

    function filePathForLocation(msg: Location): string | null {
      if (!msg.node || !msg.column) return null
      const node = join(dataDir, msg.node, msg.column.join('.'))
      if (!node.startsWith(dataDir)) return null
      return node
    }

    function withLocation<M>(path: string, message: M): M & Location {
      const relPath = relative(dataDir, path)
      if (relPath.startsWith('..')) return
      const node = dirname(path)
      const structPath = basename(path).split('.')
      return { ...message, node, column: structPath }
    }
  })

  