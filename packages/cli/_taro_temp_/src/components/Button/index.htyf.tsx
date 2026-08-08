import { Button } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.less'

export function Button2() {
  return <Button className='button'
    onClick={() => {
      Taro.showModal({
        title: '提示Htyf',
        content: '这是一个提示',
        success: (result) => {
          console.log(result)
        }
      })
    }}
  >Button htyf111</Button>
}
