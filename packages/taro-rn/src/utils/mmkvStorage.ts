import { createMMKV, type MMKV } from 'react-native-mmkv'

const DEFAULT_MMKV_ID = 'mmkv.default'

const mmkvInstances = new Map<string, MMKV>()

function getStorageId (): string {
  const appid = globalThis?.__DGZ_GLOBAL_CURRENT_MP_CLIENT__?.appid
  return appid || DEFAULT_MMKV_ID
}

export function getMMKVStorage (): MMKV {
  const id = getStorageId()
  console.log('id=====', id)
  let instance = mmkvInstances.get(id)
  if (!instance) {
    instance = createMMKV({ id })
    mmkvInstances.set(id, instance)
  }
  return instance
}

export function getStorageCurrentSize (mmkv: MMKV = getMMKVStorage()): number {
  const keys = mmkv.getAllKeys()
  const size = keys.reduce((prev, key) => {
    const value = mmkv.getString(key)
    return prev + (value ? value.length : 0)
  }, 0)
  return Number((size / 1024).toFixed(2))
}
