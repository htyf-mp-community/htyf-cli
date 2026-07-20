import fs from 'node:fs'
import path from 'node:path'
import { chalk } from '@tarojs/helper'

export function printDevelopmentTip (platform: string, workspaceRoot: string) {
  try {
    const packageInfo = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), {
      encoding: 'utf8'
    })) 
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.log(chalk.yellowBright(`Tips: [${process.env.TARO_ENV}] v${packageInfo.version}`))
    }
  } catch (error) {
    console.error(error)
  }
}