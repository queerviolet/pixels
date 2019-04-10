import { useState, useEffect } from 'react'

function Animated({ children }) {
  const [t, setT] = useState(0)
  useEffect(() => {
    let req: number; frame(0)
    return () => cancelAnimationFrame(req)
    
    function frame(ts: DOMHighResTimeStamp) {
      ts && setT(ts)
      return req = requestAnimationFrame(setT)
    }
  }, [])
  return children(t)
}
