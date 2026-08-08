import { errorHandler, successHandler } from '../../utils'
import { getMMKVStorage } from '../../utils/mmkvStorage'

export async function removeStorage (option: Taro.removeStorage.Option): Promise<TaroGeneral.CallbackResult> {
  const { key, success, fail, complete } = option
  const res = { errMsg: 'removeStorage:ok' }

  try {
    getMMKVStorage().remove(key)
    return successHandler(success, complete)(res)
  } catch (err) {
    res.errMsg = err.message
    return errorHandler(fail, complete)(res)
  }
}
