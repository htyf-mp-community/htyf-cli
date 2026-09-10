import Taro from '@tarojs/taro'

/** 旧 Playground Bundle 属于另一套原生宿主，不能交给 HTYF 执行。 */
export function explainBundleUnavailable(): Promise<Taro.showModal.SuccessCallbackResult> {
  // TODO(htyf-native): RNDevManager 不属于 HTYF 宿主，详见 docs/htyf-migration-gaps.md。
  return Taro.showModal({ title: '暂不支持旧版 Bundle', content: '此链接需要 Taro Playground 原生宿主的 RNDevManager。HTYF 无法直接运行该 Bundle；可在探索页面打开对应 Web 版本。', showCancel: false })
}
