const { promisify } = require('util')
const touch = promisify(require('touch'))
const { resolve, basename } = require('path')
const copyFile = promisify(require('fs').copyFile)
const exists = promisify(require('fs').exists)
const { readFile, writeFile, createWriteStream } = require('fs')
const { Server } = require('ws')
const url = require('url')

async function createIfNeeded(varFile) {
  const baseFile = basename(varFile, '.var')

  if (await exists(baseFile)) {
    await copyFile(baseFile, varFile)
  } else {
    console.log('touching...', varFile)
    await touch(varFile)
  }
}
const extendResolve =
  resolveDep =>
    async function(asset, dep, install = true) {
      const isLocalFile = /^[/~.]/.test(dep.name)
      if (isLocalFile && dep.name.endsWith('.var'))
        await createIfNeeded(resolve(asset.name, '..', dep.name))
      return resolveDep.call(this, asset, dep, install)
    }

const files = {}
const open = path =>
  files[path] = files[path] || (files[path] = File(path))

const concat = (a, b) => {
  const c = Buffer.alloc(a.length + b.length)
  c.set(a)
  c.set(b, a.length)
  return c
}

function File(path) {
  const observers = []
  let data = null
  readFile(path, (err, d) => err ? console.error(err) : set(d))
  const out = createWriteStream(path, { flags: 'a' })  
  return {
    path,
    set,
    push,
    subscribe(s) {
      observers.push(s)
      if (data) s.send(data)
      return () => {
        const idx = observers.indexOf(s)
        idx >= 0 && observers.splice(idx, 1)
      }
    }
  }

  function set(value, origin) {
    setValue(value, origin)
    origin && writeFile(path, value, console.error)
  }

  function push(value, origin) {
    if (!data) return
    setValue(concat(data, value), origin)
    out.write(value)
  }

  function setValue(val, origin) {
    data = val
    console.log('data=', data)
    observers.forEach(o => o !== origin && o.send(val))
  }
}

module.exports = bundler => {
  console.log('Init writable')
  const { rootDir } = bundler.options
  console.log('  rootDir: ', rootDir)

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
    const absPath = resolve(rootDir, request.path)
    const file = open(absPath)
    const dispose = file.subscribe(ws)
    ws.on('message', onMessage)
    ws.on('close', onClose)
    
    function onMessage(data) {
      if (data instanceof Buffer) {
        return file.push(data, ws)
      }
      return file.set(data, ws)
    }

    function onClose() {
      dispose()
    }
  })

  const { prototype } = bundler.constructor
  prototype.resolveDep = extendResolve(prototype.resolveDep)

  // console.log(bundler)
  bundler.addAssetType('.var', require.resolve('./asset.js'))
}