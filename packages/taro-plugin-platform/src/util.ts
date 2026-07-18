import { chalk } from '@tarojs/helper'

export function printDevelopmentTip (platform: string) {
  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.log(chalk.yellowBright(`Tips: [${process.env.TARO_ENV}]`))
  }
}