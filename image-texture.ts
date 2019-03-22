import { Texture2D } from 'luma.gl'
import { Cell, Seed } from './loop'
import { GLContext } from './contexts'

export default function ImageTexture(props: { src: string }, cell?: Cell) {
  if (!cell) return Seed(ImageTexture, props)
  const { src } = props
  const img = cell.effect('load-image', _ => {
    const img = new Image()
    img.onload = () => _(img)
    img.src = src
  }, [src])
  if (!img) return
  const gl = cell.read(GLContext)
  return cell.effect<Texture2D>('create-texture', _ => {
    _(new Texture2D(gl, {
      data: img,
      parameters: {
        [gl.TEXTURE_MAG_FILTER]: gl.NEAREST,
        [gl.TEXTURE_MIN_FILTER]: gl.NEAREST
      },
      pixelStore: {
        [gl.UNPACK_FLIP_Y_WEBGL]: false,
      },
      mipmaps: true
    }))
    return tex => tex.delete()
  }, [img])
}