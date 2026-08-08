import { errorHandler, successHandler } from '../../utils'
import { getMMKVStorage } from '../../utils/mmkvStorage'

export async function setStorage (option: Taro.setStorage.Option): Promise<TaroGeneral.CallbackResult> {
  const { key, data, success, fail, complete } = option
  const res = { errMsg: 'setStorage:ok' }

  try {
    getMMKVStorage().set(key, JSON.stringify(data))
    return successHandler(success, complete)(res)
  } catch (err) {
    res.errMsg = err.message
    return errorHandler(fail, complete)(res)
  }
}
