import GL from 'luma.gl/constants'
import { Buffer } from 'luma.gl'

declare interface Buffer {
  byteLength: number
  subData: Function
  copyData: Function
}

export class Vec2Buffer {
  static accessor: any = {
    size: 2,
    type: GL.FLOAT,
  }

  static elementSize = 4 * 2

  constructor(gl: any, sizeOrContent: number | Float32Array) {
    this.gl = gl
    this.allocBuffer(sizeOrContent)
  }

  public buffer: Buffer

  get elementSize(): number {
    return Vec2Buffer.elementSize
  }

  get count() {
    return Math.ceil(this.offset / this.elementSize)
  }

  public push(data: ArrayBufferView) {
    const neededBytes = data.byteLength + this.offset
    if (this.buffer.byteLength < neededBytes) {
      this.allocBuffer(Math.ceil((neededBytes * 2) / this.elementSize))
    }
    this.offset = set(this.buffer, data, this.offset)
  }

  private gl: any
  private offset: number = 0

  private allocBuffer(sizeOrContent: number | Float32Array) {
    const { elementSize, accessor } = Vec2Buffer    
    const byteLength = typeof sizeOrContent === 'number'
      ? elementSize * sizeOrContent
      : elementSize * Math.ceil(sizeOrContent.byteLength / elementSize)

    const { buffer, offset } = concat(this.gl, byteLength, accessor,
      this.buffer,
      ArrayBuffer.isView(sizeOrContent) && sizeOrContent)

    this.buffer = buffer
    this.offset = offset
  }
}

type DataSource = ArrayBufferView | Buffer

function concat(gl: any, byteLength: number, accessor: any, ...srcs: (DataSource | undefined)[]) {
  byteLength = Math.max(byteLength, srcs.reduce((total, s) => total + (s ? s.byteLength : 0), 0))
  const buffer = new Buffer(gl, { byteLength, accessor })
  let offset = 0
  srcs.forEach(s => {
    if (!s) return
    offset = set(buffer, s, offset)
  })
  return {buffer, offset}
}

function set(buffer: Buffer, data: DataSource, offset: number) {
  if (ArrayBuffer.isView(data)) {
    buffer.subData({
      data,
      offset
    })
  } else {
    buffer.copyData({
      sourceBuffer: data,
      readOffset: 0,
      writeOffset: offset,
      size: data.byteLength
    })
  }
  return offset + data.byteLength
}