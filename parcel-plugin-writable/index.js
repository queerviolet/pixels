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
const clientPath = require.resolve('./client.ts')

async function createVar(root, path) {
  const stubFile = resolve(root, '.stub', path + '.js')
  const relClientPath = relative(dirname(stubFile), clientPath)
  await mkdir(dirname(stubFile), { recursive: true })
  await writeFile(stubFile, `
    const Client = require(${JSON.stringify(relClientPath)}).default
    module.exports = Client.for(${JSON.stringify(path)})
  `)

  return stubFile
}

const extendResolve =
  base => async function(input, parent) {
    if (!input.startsWith('var:')) return base.call(this, input, parent)

    const { rootDir: root } = this.options
    input = input.slice('var:'.length)
    const path = relative(root, resolve(parent, '..', input))

    const stubFile = await createVar(root, path)
    const out = await base.call(this, relative(dirname(parent), stubFile), parent)
    return out
  }

function File(path) {
  const observers = []
  
  const get = async () => {
    try {
      await mkdir(dirname(path), { recursive: true })
      await touch(path)
      return readFile(path)
    } catch {
      return Buffer.alloc(0)
    }
  }
  let out
  let lastPush = 0
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
    out.write(value)
    lastPush = Date.now()
  }

  async function didChange() {
    // Ignore change events if we've recently written the file.
    if (lastPush > Date.now() - 250) return
    out && out.close()
    debug('Opening write for', path)
    out = createWriteStream(path, { flags: 'a' })
    if (observers.length) {
      const data = await get()
      observers.forEach(o => {
        o.send('truncate')
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
  watcher.on('add', f => files[f] && files[f].didChange())
  watcher.on('change', f => files[f] && files[f].didChange())
  watcher.on('unlink', f => files[f] && files[f].didChange())

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

  Resolver.prototype.resolve = extendResolve(Resolver.prototype.resolve)
}