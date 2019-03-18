const Node_path = Symbol('Context: Path to data node')

import { View, Shape, view, getLayout, struct, getContext, setContext } from './struct'

export default <S extends Shape>(path: string='/', shape: S): View<S> => {
  return setContext(view(shape), Node_path, path)
}

;(window as any).getPath = (o: any) => getContext(o, Node_path)

