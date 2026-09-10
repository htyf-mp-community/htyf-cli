import { View, Text, Button } from '@tarojs/components'
import { loadWeb } from '../../../../utils/index'

/** 百度地图依赖 DOM/BMap，HTYF 明确显示限制并提供原始 Web 示例。 */
export default function HangzhouLines() {
  return <View style={{ padding: 24 }}>
    <Text>杭州轨迹图需要百度地图 BMap 浏览器运行环境，当前 HTYF 图表渲染器不支持。</Text>
    <Button onClick={() => loadWeb({ url: 'https://echarts.apache.org/examples/zh/editor.html?c=lines-bmap', title: '杭州轨迹图' })}>打开 Web 示例</Button>
  </View>
}
