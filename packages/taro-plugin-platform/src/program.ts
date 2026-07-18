import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'

import { chalk } from '@tarojs/helper'
import * as child_process from 'child_process'

import { printDevelopmentTip } from './util'

import type { IPluginContext } from '@tarojs/service'

function checkReactNativeDependencies (packageInfo: any): boolean {
  const packageNames = ['react', 'react-native', '@htyf-mp/taro-rn', '@htyf-mp/taro-rn-runner']
  const { dependencies, devDependencies } = packageInfo
  for (let i = 0; i < packageNames.length; i++) {
    if (!dependencies[packageNames[i]] && !devDependencies[packageNames[i]]) {
      return false
    }
  }
  return true
}

function makeSureReactNativeInstalled (workspaceRoot: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const packageInfo = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), {
      encoding: 'utf8'
    }))

    if (checkReactNativeDependencies(packageInfo)) {
      resolve()
    } else {
      // 便于开发时切换版本
      const devTag = process.env.DEVTAG || 'latest'
      console.log('Installing HTYF-MP related packages:')
      const pkg = {
        "react": "19.2.3",
        "react-native": "0.86.0",
        "@react-native/metro-config": "0.86.0",
        "expo": "57.0.6",
        "@htyf-mp/taro-rn": devTag,
        "@htyf-mp/taro-components-rn": devTag,
        "@htyf-mp/taro-rn-runner": devTag,
        "@htyf-mp/taro-rn-supporter": devTag,
        "@htyf-mp/taro-runtime-rn": devTag,
      }
      let packages = Object.entries(pkg).map(([key, value]) => `${key}${value ? `@${value}` : ''}`).join(' ')
      console.log(packages)
      // windows下不加引号的话，package.json中添加的依赖不会自动带上^
      packages = packages.split(' ').map(str => `"${str}"`).join(' ')
      let installCmd = `npm install ${packages} --save`
      if (fs.existsSync(path.join(workspaceRoot, 'yarn.lock'))) {
        installCmd = `yarn add ${packages} --force`
      }
      if (fs.existsSync(path.join(workspaceRoot, 'pnpm-lock.yaml'))) {
        installCmd = `pnpm add ${packages}`
      }
      child_process.exec(installCmd, error => {
        if (error) {
          reject(error)
          return
        }
        console.log(chalk.green(`HTYF-MP related packages have been installed successfully.${os.EOL}${os.EOL}`))
        console.log(`${chalk.yellow('ATTEHNTION')}: Package.json has been modified automatically, please submit it by yourself.${os.EOL}${os.EOL}`)
        resolve()
      })
    }
  })
}

export default (ctx: IPluginContext) => {
  ctx.registerPlatform({
    name: 'htyf',
    useConfigName: 'htyf',
    async fn ({ config }) {
      const { appPath, nodeModulesPath } = ctx.paths
      const { npm } = ctx.helper
      const {
        deviceType = 'android',
        port,
        resetCache,
        publicPath,
        bundleOutput,
        sourcemapOutput,
        sourceMapUrl,
        sourcemapSourcesRoot,
        assetsDest,
        qr
      } = ctx.runOpts.options

      printDevelopmentTip('htyf')

      // 准备 rnRunner 参数
      const rnRunnerOpts = {
        ...config,
        nodeModulesPath,
        deviceType,
        port,
        qr,
        resetCache,
        publicPath,
        bundleOutput,
        sourcemapOutput,
        sourceMapUrl,
        sourcemapSourcesRoot,
        assetsDest,
        buildAdapter: config.platform,
      }

      if (!rnRunnerOpts.entry) {
        rnRunnerOpts.entry = 'app'
      }

      makeSureReactNativeInstalled(appPath).then(async () => {
        // build with metro
        const rnRunner = await npm.getNpmPkg('@htyf-mp/taro-rn-runner', appPath)
        await rnRunner(appPath, rnRunnerOpts)
      }, error => {
        console.log(chalk.red('Error when detecting HTYF-MP packages:'))
        console.log(error)
        console.log(`${chalk.greenBright('TIP')}: 1) Try to remove HTYF-MP dependencies in package.json and shoot again; 2) Install the packages above manually.`)
      })
    }
  })
}
