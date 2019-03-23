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
  evaluationCount: number[],
  evaluationDelta: number[]
}

const updateStats: (win: number) => Reducer<LifeStats, Map<string, Cell>> =
  (statsWindow: number) => (stats, cells) => {
    const newStats = {...stats}
    cells.forEach((cell, key) => {    
      const cellStats = newStats[key] || (newStats[key] = {
        key,
        title: cell.evaluator === NilEvaluator ? cell.key : (cell.evaluator.name || key),
        evaluationDelta: new Array(statsWindow).fill(0),
        evaluationCount: new Array(statsWindow).fill(0),
      })
      cellStats.evaluationCount.unshift(cell.evaluationCount)
      const [ current, prev = 0 ] = cellStats.evaluationCount
      cellStats.evaluationDelta.unshift(current - prev)
      if (cellStats.evaluationCount.length > statsWindow) {
        cellStats.evaluationCount.pop()
        cellStats.evaluationDelta.pop()
      }
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
        ({ key, title, evaluationDelta }) =>
          <div key={key} className={`cell-inspector-cell ${evaluationDelta[0] ? 'active' : 'inactive'}`}>
            <span className='cell-inspector-cell-tag'>{title}</span>
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