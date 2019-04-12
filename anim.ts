import { Seed } from './loop'
import { Presentation, Clock } from './contexts'

interface AnimProps {
  from?: number, to?: number, ms?: number, beat?: string
}

export function BuildIn(props: AnimProps = {}, cell?: any) {
  if (!cell) return Seed(BuildIn, props)
  const { from=0.0, to=1.0, ms=1000 } = props
  const prez = cell.read(Presentation.playState)
  if (!prez) return
  const prezData = cell.read(Presentation.data)
  if (!prezData) return
  const target = prezData.beats[props.beat]
  if (!target) {
    console.error('Invalid beat:', props.beat)
    return
  }

  if (!prez) return from
  if (!prez.current) return from
  
  if (prez.current.order < target.order)
    return from
  if (prez.current.order > target.order)
    return to
  if (cell.animDone === prez.ts) return to

  const start = prez.ts  
  const now = cell.read(Clock)
  const t = Math.min((now - start) / ms, 1.0)
  if (t === 1.0) {
    cell.animDone = prez.ts
  }
  const value = t * (to - from)
  return value
}