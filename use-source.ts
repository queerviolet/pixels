import { useState, useEffect } from 'react'
import { readSource } from 'parcel-plugin-writable/src/node'

function useSource(file: string) {
  const [ src, setSrc ] = useState<string>(null)
  useEffect(() => { readSource(file).then(setSrc) }, [file])
  return src
}

export default useSource