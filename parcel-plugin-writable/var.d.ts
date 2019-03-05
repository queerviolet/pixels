type Schema = {
  [key: string]: any
}

type Shape<S extends Schema> = {
  [key in keyof S]: Node
}

type Data = ArrayBuffer | ArrayBufferView | number
interface Node {
  (child: string): Node | any
  (push: Data): Node | any
  <S extends Schema>(schema: S): Shape<S>
}
declare const stream: Node
export default stream