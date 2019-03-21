import GL from 'luma.gl/constants'
import { Texture2D, _Accessor as Accessor } from 'luma.gl'
import { Unsubscribable } from 'rxjs';

declare interface Buffer {
  byteLength: number
  subData: Function
  copyData: Function
  setByteLength(byteLength: number): void
  _deleteHandle: () => void
}


export class TextureDataStream {
  constructor(private gl: any, private componentCount: number=1) {
  }

  public texture: Texture2D
  public array: Float32Array
  public count: number = 0
  private get floatOffset() {
    return this.count * this.componentCount
  }

  public push(data: ArrayBuffer | ArrayBufferView) {
    const elementCount = Math.ceil(data.byteLength / this.componentCount / 4)
    const neededElements = elementCount + this.count
    const neededBytes = neededElements * 4
    if ((!this.array || this.array.byteLength < neededBytes) || (this.texture && this.texture.width < neededElements)) {
      console.log('alloc', neededElements * 2)
      this.allocTexture(neededElements * 2)
      // console.log('this.buffer.byteLength=', this.buffer.byteLength)
    }    

    let floats: Float32Array
    if (data instanceof Float32Array) {
      this.array.set(data, this.floatOffset)
      floats = data
    } else {
      // console.log('data is something else')
      const buf = ArrayBuffer.isView(data) ? data.buffer : data
      const offset = ArrayBuffer.isView(data) ? data.byteOffset : 0            
      // console.log('buffer=', buf, 'array=', this.array.byteLength)
      floats = new Float32Array(buf, offset, data.byteLength / 4)
      this.array.set(floats, this.floatOffset)
    }

    set(this.texture, floats, this.componentCount, this.count)
    this.array.set(floats, this.floatOffset)

    // console.log('did push', data.byteLength, ' bytes into ', this.array.byteLength, 'offset:', this.offset)
    // console.log(this.array)
    // console.log(this, 'new offset=', newOffset, 'count=', this.count)
    this.count += elementCount
  }

  public clear() {
    if (this.texture) {
      this.texture._deleteHandle()
      this.texture = null
    }
    this.array && (this.array = new Float32Array(0))
    this.count = 0
  }

  private allocTexture(elementCount: number) {
    const array = concatArrays(elementCount * this.componentCount * 4, this.array)
    const texture = concat(this.gl, elementCount, this.componentCount, this.array)

    if (this.texture) {
      this.texture._deleteHandle()
    }
    this.texture = texture
    this.array = array
  }
}

function concatArrays(byteLength: number, ...srcs: Float32Array[]) {
  byteLength = Math.max(byteLength, srcs.reduce((total, s) => total + (s ? s.byteLength : 0), 0))
  // console.log('concatArrays byteLength=', byteLength)
  const array = new Float32Array(byteLength)
  // console.log('creating array of size', array.byteLength)
  let offset = 0
  srcs.forEach(s => {
    if (!s) return
    // console.log('set', s.byteLength, 'at offset', offset, 'in array of byteLength=', array.byteLength, 'source:', s)
    array.set(s, offset)    
    offset += s.length
  })
  // console.log('copied data into new array', array)
  return array
}

function concat(gl: any, elementCount: number, componentCount: number, data: Float32Array) { 
  const format = componentCount === 1
      ? GL.R32F
      :
    componentCount === 2
      ? GL.RG32F
      :
    componentCount === 3
      ? GL.RGB
      :
    componentCount === 4
      ? GL.RGBA
      : 
      0
  if (!format) throw new Error(`Unexpected component count: ${componentCount}`)
  const texture = new Texture2D(gl, {
    format,
    data,
    type: GL.FLOAT,
    width: elementCount,
    mipmaps: false,
    parameters: {
      [GL.TEXTURE_MAG_FILTER]: GL.NEAREST,
      [GL.TEXTURE_MIN_FILTER]: GL.NEAREST
    }
  })
  return texture
}

function set(texture: Texture2D, data: Float32Array, componentCount: number, offset: number) {
  if (!data.byteLength) { return }

  console.log('set(texture:', texture.width, ', data[width]:', data.byteLength / 4 / componentCount,  'offset: ', offset, ')')
  texture.setSubImageData({
    pixels: data,
    x: offset, y: 0,
    width: data.byteLength / 4 / componentCount,
    height: 1,
  })  
}