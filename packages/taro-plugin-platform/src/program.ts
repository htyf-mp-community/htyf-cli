import * as fs from 'node:fs'
import * as os from 'node:os'
import * as path from 'node:path'
import inquirer from 'inquirer'

import { chalk } from '@tarojs/helper'
import * as child_process from 'child_process'

import { printDevelopmentTip } from './util'
import { syncDepsShell } from './sync-deps'

import type { IPluginContext } from '@tarojs/service'
import { getAppExposesOptions, mpBuildShell } from './htyf-build'

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

function checkWebpackConfig (workspaceRoot: string): boolean {
  const  exists = fs.existsSync(path.join(workspaceRoot, 'webpack.config.mjs'))
  if (!exists) {
    fs.copyFileSync(path.join(__dirname, '../webpack.config.mjs'), path.join(workspaceRoot, 'webpack.config.mjs'))
    return false
  } 
  return true
}

function checkHtyfConfig (workspaceRoot: string): boolean {
  const  exists = fs.existsSync(path.join(workspaceRoot, 'htyf.config.json'))
  if (!exists) {
    fs.copyFileSync(path.join(__dirname, '../htyf.config.json'), path.join(workspaceRoot, 'htyf.config.json'))
    return false
  } 
  return true
}

function makeSureReactNativeInstalled (workspaceRoot: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const packageInfo = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), {
      encoding: 'utf8'
    }))
    checkWebpackConfig(workspaceRoot);
    checkHtyfConfig(workspaceRoot)
    if (checkReactNativeDependencies(packageInfo)) {
      resolve()
    } else {
      // 便于开发时切换版本
      const devTag = process.env.DEVTAG || 'latest'
      console.log('Installing HTYF-MP related packages:')
      const pkg = {
        "react": "19.2.3",
        "react-18": "npm:react@18.3.1",
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
        deviceType = 'ios',
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

      printDevelopmentTip('htyf', appPath)

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

      /**
       * 用inquirer 添加一些额外的命令 
       * [ACTION_TYPES.MP_DEV]: 'htyf小程序本地开发',
       * [ACTION_TYPES.MP_BUILD]: 'htyf小程序打包',
       * [ACTION_TYPES.MP_DEBUG]: 'htyf小程序真机调试',
       * [ACTION_TYPES.SYNC_DEPS]: 'htyf同步依赖版本',
       * [ACTION_TYPES.QUIT]: '退出',
       *  */ 
      const ACTION_TYPES = {
        MP_DEV: 'mp_dev',
        MP_BUILD: 'mp_build',
        MP_DEBUG: 'mp_debug',
        SYNC_DEPS: 'sync_deps',
        QUIT: 'quit',
      }
      // @ts-ignore
      const inquirerFun = typeof inquirer?.prompt === 'function' ? inquirer : inquirer.default;
      const result = await inquirerFun
      // @ts-ignore
      .prompt([
        {
          type: 'rawlist',
          name: 'index',
          message: '请选择你想要执行的操作：',
          choices: [
            { name: '红糖小程序 - 本地开发', value: ACTION_TYPES.MP_DEV },
            { name: '红糖小程序 - 真机调试', value: ACTION_TYPES.MP_DEBUG },
            { name: '红糖小程序 - 打包小程序', value: ACTION_TYPES.MP_BUILD },
            { name: '同步依赖版本', value: ACTION_TYPES.SYNC_DEPS },
            { name: '👋 退出', value: ACTION_TYPES.QUIT },
          ],
        },
      ])

      // 默认不开启watch
      rnRunnerOpts.isWatch = false;

      if (result.index === ACTION_TYPES.QUIT) {
        process.exit(0)
      }

      if (result.index === ACTION_TYPES.SYNC_DEPS) {
        console.log('sync_deps')
        await syncDepsShell(appPath)
        return
      }

      if (result.index === ACTION_TYPES.MP_DEV) {
        console.log('mp_dev')
        rnRunnerOpts.isWatch = true;
      }

      if (result.index === ACTION_TYPES.MP_DEBUG || result.index === ACTION_TYPES.MP_BUILD) {
        // 要打生产包让 env 为 production; 让react使用production模式
        process.env.NODE_ENV = 'production'
      }
      console.log(JSON.stringify(rnRunnerOpts, null, 2))

      makeSureReactNativeInstalled(appPath).then(async () => {
        // build with metro
        const rnRunner = await npm.getNpmPkg('@htyf-mp/taro-rn-runner', appPath)
        process.env.APP_EXPOSES_OPTIONS = '';
        process.env.APP_ROOT_INDEX_PATH = '';
        if (result.index !== ACTION_TYPES.MP_DEV) {
          process.env.APP_EXPOSES_OPTIONS = JSON.stringify((await getAppExposesOptions(appPath)).APP_EXPOSES_OPTIONS);
          process.env.APP_ROOT_INDEX_PATH = (await getAppExposesOptions(appPath)).APP_ROOT_INDEX_PATH;
        }
        
        await rnRunner(appPath, rnRunnerOpts,
        (code) => {
          if (code === 0) {
            if (result.index === ACTION_TYPES.MP_DEBUG) {
              mpBuildShell(appPath, 'debug')
            }
            
            if (result.index === ACTION_TYPES.MP_BUILD) {
              mpBuildShell(appPath, 'build')
            }
          } else {
            console.error('build failed')
            process.exit(1)
          }
        })

      }, error => {
        console.log(chalk.red('Error when detecting HTYF-MP packages:'))
        console.log(error)
        console.log(`${chalk.greenBright('TIP')}: 1) Try to remove HTYF-MP dependencies in package.json and shoot again; 2) Install the packages above manually.`)
      })
    }
  })
}
