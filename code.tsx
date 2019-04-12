import * as React from 'react'
import { useEffect, useRef } from 'react'

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
  title?: string
  scrollTo?: number
  highlight?: [number, number]
}

export default ({ src, title, frame, language='typescript' as Language, scrollTo, highlight }: Props) => {
  const code = useSource(src)
  const lineRefs = scrollTo ?
    {
      [scrollTo]: e => {
        e && e.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    } : {}
  return <Panel title={title || basename(src)} frame={frame}>
    <Code highlight={highlight} lineRefs={lineRefs} language={language}>{code}</Code>
  </Panel>
}

type CodeProps = {
  src?: string
  language?: Language
  children: string
  lineRefs?: { [num: number]: any }
  highlight?: [number, number]
}

const Code = ({ language='typescript' as Language, children,
  lineRefs={},
  highlight,
}: CodeProps) => {
  if (!children) return null
  return <Highlight {...defaultProps} theme={theme} code={children} language={language}>
    {({ className, style, tokens, getLineProps, getTokenProps }) => (
      <pre className={className} style={{...style, background: 'none'}}>
        {tokens.map((line, i) => (
          <div {...getLineProps({ line, key: i })} ref={lineRefs[i + 1]}
            data-linum={i + 1}
            data-highlight={isHighlighted(i + 1, highlight)}>
            {line.map((token, key) => (
              <span {...getTokenProps({ token, key })} />
            ))}
          </div>
        ))}
      </pre>
    )}
  </Highlight>
}

const isHighlighted = (linum: number, highlight?: [number, number]) =>
  (highlight && (linum >= highlight[0] && linum <= highlight[1])) ? true : void 0