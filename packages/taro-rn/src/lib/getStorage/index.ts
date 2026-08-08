import { errorHandler, successHandler } from '../../utils'
import { getMMKVStorage } from '../../utils/mmkvStorage'

export async function getStorage (option: Taro.getStorage.Option<any>): Promise<Taro.getStorage.SuccessCallbackResult<any>> {
  const { key, success, fail, complete } = option
  const res = { errMsg: 'getStorage:ok' }

  try {
    const data = getMMKVStorage().getString(key)
    if (data) {
      const result = {
        data: JSON.parse(data),
        ...res
      }
      return successHandler(success, complete)(result)
    } else {
      res.errMsg = 'getStorage:fail data not found'
      return errorHandler(fail, complete)(res)
    }
  } catch (err) {
    res.errMsg = err.message
    return errorHandler(fail, complete)(res)
  }
}
