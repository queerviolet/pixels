import GL from 'luma.gl/constants'
import { Buffer, _Accessor as Accessor } from 'luma.gl'

declare interface Buffer {
  byteLength: number
  subData: Function
  copyData: Function
  setByteLength(byteLength: number): void
}

export class Stream {
  constructor(private gl: any, private accessor: any, count?: number) {
    count && this.allocBuffer(count * this.elementSize)
  }

  public buffer: Buffer

  get elementSize(): number {
    return Accessor.getBytesPerVertex(this.accessor)
  }

  get count() {
    return Math.ceil(this.offset / this.elementSize)
  }

  public push(data: ArrayBufferView) {
    const neededBytes = data.byteLength + this.offset
    if (!this.buffer || this.buffer.byteLength < neededBytes) {
      console.log('alloc', neededBytes * 2)
      this.allocBuffer(neededBytes * 2)
    }
    this.offset = set(this.buffer, data, this.offset)
  }

  public clear() {
    this.buffer && this.buffer.setByteLength(0)
    this.offset = 0
  }

  private offset: number = 0

  private allocBuffer(byteLength: number) {
    const { buffer, offset } = concat(this.gl, byteLength, this.accessor, this.buffer)

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
  if (!data.byteLength) { return offset }

  if (ArrayBuffer.isView(data) || data instanceof ArrayBuffer) {
    buffer.subData({
      data,
      offset
    })
  } else {
    console.log('copying from', data, 'to', buffer)
    buffer.copyData({
      sourceBuffer: data,
      readOffset: 0,
      writeOffset: offset,
      size: data.byteLength
    })
  }
  return offset + data.byteLength
}