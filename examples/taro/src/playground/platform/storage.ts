import Taro from '@tarojs/taro'

const prefix = 'playground:storage-demo:'
function readInfo(): Promise<Taro.getStorageInfo.SuccessCallbackOption> {
  return new Promise((resolve, reject) => { Taro.getStorageInfo({ success: resolve, fail: reject }) })
}
/** 存储示例独立命名空间，清空操作仅删除本示例创建的键。 */
export const storageApi = {
  setStorage: (options: Taro.setStorage.Option) => Taro.setStorage({ ...options, key: prefix + options.key }),
  getStorage: (options: Taro.getStorage.Option<unknown>) => Taro.getStorage({ ...options, key: prefix + options.key }),
  getStorageInfo: (options: Taro.getStorageInfo.Option = {}) => {
    return readInfo().then(result => {
      const info = { ...result, errMsg: 'getStorageInfo:ok', keys: result.keys.filter(key => key.startsWith(prefix)).map(key => key.slice(prefix.length)) }
      options.success?.(info); options.complete?.(info)
      return info
    }, error => { options.fail?.(error); options.complete?.(error); throw error })
  },
  clearStorage: () => readInfo().then(async result => {
    await Promise.all(result.keys.filter(key => key.startsWith(prefix)).map(key => Taro.removeStorage({ key })))
    return { errMsg: 'clearStorage:ok' }
  })
}
