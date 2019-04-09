import { Seed, Cell } from './loop'
import { Presentation, Clock } from './contexts'

interface AnimProps {
  from?: number, to?: number, ms?: number, name?: string
}

export function BuildIn(props: AnimProps = {}, cell?: any) {
  if (!cell) return Seed(BuildIn, props)
  const { from=0.0, to=1.0, ms=1000 } = props
  const prez = cell.read(Presentation)
  if (!prez) return
  if (prez.current.id !== cell.beatId) {
    cell.beatId = prez.current.id
    cell.animDone = false
  }
  if (cell.animDone) return to

  const start = prez.ts  
  const now = cell.read(Clock)
  const t = Math.min((now - start) / ms, 1.0)
  if (t === 1.0) {
    cell.animDone = true
  }
  const value = t * (to - from)
  return value
}