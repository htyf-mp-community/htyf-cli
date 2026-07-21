import { View, Text } from '@tarojs/components'
import { useLoad } from '@tarojs/taro'
import { Button2 } from '@/components'
import './index.less'


export default function Index () {
  useLoad(() => {
    console.log('Page loaded.')
  })

  return (
    <View className='index'>
      <Text>红糖云服</Text>
      <Button2 />
    </View>
  )
}
