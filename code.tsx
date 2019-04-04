import * as React from 'react'
import Highlight, { defaultProps, Language } from 'prism-react-renderer'
import theme from 'prism-react-renderer/themes/vsDark'
import useSource from './use-source'

import { basename } from 'path'
import { Panel } from './panel'
import { StageRect } from './stage'


type Props = {
  src: string
  language?: Language
  frame?: StageRect
}

export default ({ src, frame, language='typescript' as Language }: Props) => {
  const title = basename(src)
  const code = useSource(src)
  return <Panel title={title} frame={frame}>
    <Code language={language}>{code}</Code>
  </Panel>
}

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
