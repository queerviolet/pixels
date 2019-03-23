import * as React from 'react'
import { Fragment, useContext, useState, useEffect, useMemo, useReducer, Reducer } from 'react';

import { Context as CellContext, Cell, tag, NilEvaluator } from './loop'
import { string } from 'prop-types';

interface Props {
  collectStatsMs?: number
  statsWindow?: number
}

type LifeStats = { [key: string]: CellStats }
type CellStats = {
  key: string,
  title: string,
  evaluationCount: number[]
  evaluationDelta: number[]
  outputs: string[],
}

const updateStats: (win: number) => Reducer<LifeStats, Map<string, Cell>> =
  (statsWindow: number) => (stats, cells) => {
    const newStats: LifeStats = {}
    cells.forEach((cell, key) => {    
      const s = {...stats[key]}
      s.key = s.key || key
      s.title = s.title || (cell.evaluator === NilEvaluator ? cell.key : (cell.evaluator.name || key))
      s.evaluationDelta = s.evaluationDelta || new Array(statsWindow).fill(0)
      s.evaluationCount = s.evaluationCount || new Array(statsWindow).fill(0)
      s.outputs = s.outputs || []

      s.evaluationCount.unshift(cell.evaluationCount)
      const [ current, prev = 0 ] = s.evaluationCount
      s.evaluationDelta.unshift(current - prev)
      if (s.evaluationCount.length > statsWindow) {
        s.evaluationCount.pop()
        s.evaluationDelta.pop()
      }
      s.outputs = Object.keys(cell.outputs)

      newStats[key] = s
    })
    return newStats
  }

export default function CellInspector({ collectStatsMs = 200, statsWindow=10 }: Props) {
  const life = useContext(CellContext)
  const [ stats, update ] = useReducer(updateStats(statsWindow), {})
  // const collectStats = useMemo(() => , [ life, statsWindow ])
  useEffect(() => {
    const interval = setInterval(
      () => update(life.cells),
      collectStatsMs)
    return () => clearInterval(interval)
  }, [ life, statsWindow ])

  return <div className='cell-inspector'>{
    Object.values(stats)
      .map(
        ({ key, title, evaluationDelta, outputs }) =>
          <div key={key} className={`
            cell-inspector-cell
            ${evaluationDelta[0] ? 'active' : 'inactive'}
            `}>
            <span className='cell-inspector-cell-tag'>{title} ({outputs.length}) </span>
            <SparkLine data={evaluationDelta} />
          </div>
      )
    }</div>
}

interface SparkLineProps {
  data: number[]
  min?: number
  max?: number
}
function SparkLine({ data, min = 0, max = 20 }: SparkLineProps) {
  const range = max - min
  return <span className='spark-line'>{
    data.map((value, key) => <span key={key}
      className='spark-line-value'
      style={{ height: 100 * (value - min) / range + '%' }} />
    )
  }</span>
}