import { ImageManipulator, SaveFormat } from 'expo-image-manipulator'
import { Image } from 'react-native'

import { errorHandler, successHandler } from '../../utils'

function getImageSize (src: string): Promise<{ width: number, height: number } | null> {
  return new Promise((resolve) => {
    Image.getSize(
      src,
      (width, height) => resolve({ width, height }),
      () => resolve(null)
    )
  })
}

function getSaveFormat (src: string): SaveFormat {
  return src.toLocaleLowerCase().endsWith('.png') ? SaveFormat.PNG : SaveFormat.JPEG
}

async function createCompressedImage (
  src: string,
  quality: number,
  width = 800,
  height = 800
) {
  const image = await ImageManipulator.manipulate(src)
    .resize({ width, height })
    .renderAsync()

  return image.saveAsync({
    format: getSaveFormat(src),
    compress: quality / 100,
  })
}

/**
 * 压缩图片
 * @param opts
 */
export async function compressImage (opt: Taro.compressImage.Option): Promise<Taro.compressImage.SuccessCallbackResult> {
  const {
    src,
    quality = 80,
    success,
    fail,
    complete
  } = opt

  const res = { errMsg: 'compressImage:ok', tempFilePath: '' }

  try {
    const size = await getImageSize(src)
    const { uri } = await createCompressedImage(
      src,
      quality,
      size?.width,
      size?.height
    )
    res.tempFilePath = uri
    return successHandler(success, complete)(res)
  } catch (err) {
    res.errMsg = err instanceof Error ? err.message : String(err)
    return errorHandler(fail, complete)(res)
  }
}
