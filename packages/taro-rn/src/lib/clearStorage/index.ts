import { errorHandler, successHandler } from '../../utils'
import { getMMKVStorage } from '../../utils/mmkvStorage'

export async function clearStorage (option: Taro.clearStorage.Option = {}): Promise<TaroGeneral.CallbackResult> {
  const { success, fail, complete } = option
  const res = { errMsg: 'clearStorage:ok' }

  try {
    getMMKVStorage().clearAll()
    return successHandler(success, complete)(res)
  } catch (err) {
    res.errMsg = err.message
    return errorHandler(fail, complete)(res)
  }
}
