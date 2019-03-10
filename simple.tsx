import * as React from 'react'
import Loop, { createLoop, Print, Value, Cell, useRead } from './loop'
import { render } from "react-dom";

const loop = createLoop()
function tick() {
  requestAnimationFrame(tick)
  loop.run()
}
tick()

render(
  <Loop loop={loop}>
    <Print input={<Value value='hi there' />} />
    <Print input={<Value value='hi there' />} />
    <Print input={<Value value='should be only one hello' />} />
  </Loop>,
  document.getElementById('main'))