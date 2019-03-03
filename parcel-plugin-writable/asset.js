const { dirname, relative } = require('path')

const clientPath = require.resolve('./client.ts')
class WritableAsset extends module.parent.require('./assets/JSAsset') {  
  async load() {
    const rel = relative(this.options.rootDir, this.name)
    return `
      const Client = require(${JSON.stringify(relative(dirname(this.name), clientPath))}).default
      module.exports = Client.for(${JSON.stringify(rel)})

      module.hot.accept(() => console.log('asdf'))
    `
  }
}

module.exports = WritableAsset
