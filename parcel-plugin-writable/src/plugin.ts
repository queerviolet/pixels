import { join } from 'path'
import Server from './server'

module.exports = ({ server, options }: any) => Server({
  dataDir: join(options.rootDir, '.data'),
  sourceDir: options.rootDir,
  server,
})
