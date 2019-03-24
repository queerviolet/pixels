import { Program, VertexArray } from 'luma.gl'
import { Cell, Seed } from './loop'
import { GLContext } from './contexts'

type Props = { vs: string, fs: string }

export type Shader = {
  program: Program
  vertexArray: VertexArray
}

export default function Shader(props: Props, cell?: Cell): Shader {
  if (!cell) return Seed<Shader>(Shader, props)
  const { vs, fs } = props
  const gl = cell.read(GLContext)
  return cell.effect<Shader>('program', _ => {    
    const program = new Program(gl, { vs, fs })    
    const vertexArray = new VertexArray(gl, { program })
    _({program, vertexArray})
    return (binding: any) => {
      if (!binding) return
      const { program, vertexArray } = binding
      program.delete()
      vertexArray.delete()
    }
  }, [gl, vs, fs])
}