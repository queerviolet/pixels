const debug = require('debug')('writable')
const { promisify } = require('util')
const touch = promisify(require('touch'))
const { join, resolve, dirname, relative, basename } = require('path')
const copyFile = promisify(require('fs').copyFile)
const exists = promisify(require('fs').exists)
const mkdir = promisify(require('fs').mkdir)
const { createWriteStream } = require('fs')
const readFile = promisify(require('fs').readFile)
const writeFile = promisify(require('fs').writeFile)
const { Server } = require('ws')
const url = require('url')
const Resolver = module.parent.require('../Resolver')
const chokidar = require('chokidar')

function File(path) {
  const observers = []
  
  const create = async () => {
    await mkdir(dirname(path), { recursive: true })
    await touch(path)
  }

  const get = async () => {
    try {
      await create()
      return readFile(path)
    } catch {
      return Buffer.alloc(0)
    }
  }

  let out
  let lastActivity = 0
  didChange()
  return {
    path,
    push,
    didChange,
    subscribe(s) {
      observers.push(s)
      get().then(data => s.send(data))
      return () => {
        const idx = observers.indexOf(s)
        idx >= 0 && observers.splice(idx, 1)
      }
    }
  }

  function push(value, origin) {
    observers.forEach(o => o !== origin && o.send(value))
    // console.log('write', path, value)
    out.write(value)
    lastActivity = Date.now()
  }

  async function didChange() {
    // Ignore change events if we've recently written the file.
    if (lastActivity > Date.now() - 250) return
    lastActivity = Date.now()
    if (out) {
      debug('Will reopen', path)
      out.close()
    }
    debug('Touch:', path)
    await create()
    debug('Open append stream:', path)
    out = createWriteStream(path, { flags: 'a' })
    if (observers.length) {
      debug('Read:', path)
      const data = await get()
      observers.forEach(o => {
        debug('Truncating', path)        
        o.send('truncate')
        debug('Data for', path, data.byteLength, 'bytes')
        o.send(data)
      })
    }
  }
}

const varFile = (root, path) => join(root, '.var', path)

module.exports = bundler => {
  const watcher = chokidar.watch()
  const files = {}
  const open = path => {
    const vPath = varFile(bundler.options.rootDir, path)
    watcher.add(vPath)
    return files[vPath] = files[vPath] ||
      (files[vPath] = File(vPath))
  }
  const fileChanged = path => {
    files[path] && files[path].didChange()
  }
  watcher.on('add', fileChanged)
  watcher.on('change', fileChanged)
  watcher.on('unlink', fileChanged)

  const wss = new Server({ noServer: true })

  bundler.server.on('upgrade', (request, socket, head) => {
    const { pathname } = url.parse(request.url)
    if (pathname.startsWith('/__write__/')) {
      const path = pathname.slice('/__write__/'.length)
      wss.handleUpgrade(request, socket, head, ws => {
        request.path = path
        wss.emit('connection', ws, request)
      })
    }
  })
  
  wss.on('connection', (ws, request) => {
    const file = open(request.path)
    const dispose = file.subscribe(ws)
    ws.on('message', onMessage)
    ws.on('close', onClose)
    
    function onMessage(data) {
      if (data instanceof Buffer) {
        return file.push(data, ws)
      }
    }

    function onClose() {
      dispose()
    }
  })
}