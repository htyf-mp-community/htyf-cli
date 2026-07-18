import {
  getCurrentPosition,
  requestPermission,
} from 'react-native-nitro-geolocation'

import { errorHandler } from '../../utils'

export async function getLocation (opts: Taro.getLocation.Option = {}): Promise<Taro.getLocation.SuccessCallbackResult> {
  const { isHighAccuracy = false, highAccuracyExpireTime = 3000, success, fail, complete } = opts

  try {
    const status = await requestPermission()
    if (status !== 'granted') {
      const res = { errMsg: 'Permissions denied!' }
      return errorHandler(fail, complete)(res)
    }
  } catch {
    const res = { errMsg: 'Permissions denied!' }
    return errorHandler(fail, complete)(res)
  }

  try {
    const { coords } = await getCurrentPosition({
      timeout: highAccuracyExpireTime,
      maximumAge: 0,
      enableHighAccuracy: isHighAccuracy,
    })
    const { latitude, longitude, altitude, accuracy, speed } = coords
    const res = {
      latitude,
      longitude,
      speed: speed ?? 0,
      altitude: altitude ?? 0,
      accuracy,
      verticalAccuracy: 0,
      horizontalAccuracy: 0,
      errMsg: 'getLocation:ok'
    }
    success?.(res)
    complete?.(res)
    return res
  } catch (err) {
    const res = {
      errMsg: 'getLocation fail',
      err
    }
    fail?.(res)
    complete?.(res)
    return Promise.reject(res)
  }
}
