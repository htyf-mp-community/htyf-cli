import {  mergeReconciler, mergeInternalComponents } from '@tarojs/shared'

import { initHtyfApi } from './apis'
import { components } from './components'

mergeReconciler({
  initNativeApi: function (taro: any) {
    initHtyfApi(taro)
  },
})
mergeInternalComponents(components)

