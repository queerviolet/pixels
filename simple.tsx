import * as React from 'react'
import Loop, { Print, Value, Cell, useRead } from './loop'
import { render } from "react-dom";

render(
  <Loop>
    <Print input={<Value value='hi there' />} />
    <Print input={<Value value='hi there' />} />
    <Print input={<Value value='should be only one hello' />} />
  </Loop>,
  document.getElementById('main'))