import { Program, VertexArray } from 'luma.gl'
import { Cell, Seed } from './loop'
import { GLContext } from './contexts'

type WithShaderSource = { vs: string, fs: string }

export default function Shader(props: WithShaderSource, cell?: Cell) {
  if (!cell) return Seed(Shader, props)
  const { vs, fs } = props
  const gl = cell.read(GLContext)
  return cell.effect('program', _ => {    
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