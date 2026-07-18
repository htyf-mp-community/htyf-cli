import { getBabelConfig } from './babel'

import type { IProjectConfig } from '@tarojs/taro/types/compile'

interface WebpackLoader {
  loader: string
  options?: Record<string, unknown>
}

interface WebpackResolveData {
  createData?: {
    resource?: string
    loaders?: WebpackLoader[]
  }
}

interface WebpackCompiler {
  hooks: {
    normalModuleFactory: {
      tap: (
        name: string,
        handler: (normalModuleFactory: {
          hooks: {
            afterResolve: {
              tap: (
                name: string,
                handler: (resolveData: WebpackResolveData) => void
              ) => void
            }
          }
        }) => void
      ) => void
    }
  }
}

const PLUGIN_NAME = 'TaroWebpackPlugin'
const TRANSFORM_REGEXP = /\.(?:[cm]?[jt]sx?|css|scss|sass|less|styl|stylus|pcss)$/
const BABEL_LOADER_REGEXP = /[\\/]babel-loader[\\/]/

/**
 * 将 Taro RN transformer loader 注入 Webpack 模块构建流程。
 */
export class TaroWebpackPlugin {
  private readonly config: IProjectConfig
  private readonly loaderPath = require.resolve('./webpackLoader')
  private readonly platform: string

  constructor ({ config, platform }: { config: IProjectConfig, platform: string }) {
    this.config = config
    this.platform = platform
  }

  apply (compiler: WebpackCompiler) {
    compiler.hooks.normalModuleFactory.tap(PLUGIN_NAME, normalModuleFactory => {
      normalModuleFactory.hooks.afterResolve.tap(PLUGIN_NAME, resolveData => {
        const createData = resolveData.createData
        const resource = createData?.resource
        const loaders = createData?.loaders

        if (!resource || !loaders || !TRANSFORM_REGEXP.test(resource)) {
          return
        }
        if (loaders.some(item => item.loader === this.loaderPath)) {
          return
        }

        const babelLoader = loaders.find(item => BABEL_LOADER_REGEXP.test(item.loader))
        if (babelLoader && /\.[cm]?[jt]sx?$/.test(resource)) {
          const babelOptions = babelLoader.options || {}
          const babelPlugins = Array.isArray(babelOptions.plugins)
            ? babelOptions.plugins
            : []
          const { plugins } = getBabelConfig(
            this.config,
            /\.config\.(t|j)sx?$/.test(resource)
          )
          babelLoader.options = {
            ...babelOptions,
            plugins: [...babelPlugins, ...plugins]
          }
        }

        // Webpack loader 从后向前执行，放在末尾可确保先进行 Taro 转换。
        loaders.push({
          loader: this.loaderPath,
          options: { platform: this.platform }
        })
      })
    })
  }
}
