import * as React from 'react'
import { basename } from 'path'
import useSource from './use-source'

import { StageRect, pixelRect } from './stage'

import Highlight, { defaultProps, Language } from 'prism-react-renderer'
import theme from 'prism-react-renderer/themes/vsDark'

const Code = ({ language='typescript' as Language, children }) => {
  if (!children) return null
  return <Highlight {...defaultProps} theme={theme} code={children} language={language}>
    {({ className, style, tokens, getLineProps, getTokenProps }) => (
      <pre className={className} style={{...style, background: 'none'}}>
        {tokens.map((line, i) => (
          <div {...getLineProps({ line, key: i })}>
            {line.map((token, key) => (
              <span {...getTokenProps({ token, key })} />
            ))}
          </div>
        ))}
      </pre>
    )}
  </Highlight>
}

type Props = {
  file: string
  frame?: StageRect
}

export function Panel({ file, frame=[[-5, -5], [5, 5]] }: Props) {
  const name = basename(file)
  const src = useSource(file)

  return <div className={`panel ${src ? 'loaded' : ''}`} style={styleFromFrame(frame)}>
    <h1>{name}</h1>    
    <Code language='typescript'>{src}</Code>
  </div>
}

const styleFromFrame = (frame: StageRect) => {
  const style = {}
  const px = pixelRect(frame)
  for (const [key, value] of Object.entries(px)) {
    style[`--panel-${key}`] = value + 'px'
  }
  return style
}