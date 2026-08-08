import { errorHandler, successHandler } from '../../utils'
import { getMMKVStorage, getStorageCurrentSize } from '../../utils/mmkvStorage'

export async function getStorageInfo (option: Taro.getStorageInfo.Option = {}): Promise<TaroGeneral.CallbackResult> {
  const { success, fail, complete } = option
  const res = { errMsg: 'getStorageInfo:ok' }

  try {
    const mmkv = getMMKVStorage()
    const result = {
      ...res,
      keys: mmkv.getAllKeys(),
      currentSize: getStorageCurrentSize(mmkv),
      limitSize: Infinity
    }
    // @ts-ignore
    return successHandler(success, complete)(result)
  } catch (err) {
    res.errMsg = err.message
    return errorHandler(fail, complete)(err)
  }
}
