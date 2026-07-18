// @ts-ignore
import { transform } from '@htyf-mp/taro-rn-transformer'
import { rollupTransform } from '@htyf-mp/taro-rn-style-transformer'

import { entryFilePath } from './defaults'
import { getProjectConfig } from './utils'

interface WebpackLoaderContext {
  async: () => (
    error: Error | null,
    result?: string,
    sourceMap?: unknown
  ) => void
  getOptions: () => {
    platform?: 'android' | 'ios' | 'harmony'
  }
  resourcePath: string
  rootContext: string
}

interface TransformResult {
  code?: string
}

const STYLE_REGEXP = /\.(?:css|scss|sass|less|styl|stylus|pcss)$/

/**
 * 在 babel-loader 之前执行 Taro RN 源码转换。
 */
export default async function taroWebpackLoader (
  this: WebpackLoaderContext,
  source: string,
  sourceMap?: unknown
) {
  const callback = this.async()

  try {
    const config = await getProjectConfig()
    const { platform = 'ios' } = this.getOptions()

    if (STYLE_REGEXP.test(this.resourcePath)) {
      const styleTransformer = rollupTransform({
        platform,
        projectRoot: this.rootContext || process.cwd(),
        config
      })
      const result = await styleTransformer.transform(source, this.resourcePath)
      return callback(null, result?.code ?? source, sourceMap)
    }

    const rnConfig = config.htyf || {}
    const entry = rnConfig.entry || 'app'

    const result = await Promise.resolve(transform({
      src: source,
      filename: this.resourcePath,
      options: {
        projectRoot: this.rootContext || process.cwd(),
        sourceRoot: config.sourceRoot || 'src',
        entry,
        appName: rnConfig.appName,
        designWidth: rnConfig.designWidth || config.designWidth,
        deviceRatio: rnConfig.deviceRatio || config.deviceRatio,
        isEntryFile: (filename: string) => filename.includes(entryFilePath),
        nextTransformer: ({ src }: { src: string }) => ({ code: src }),
        rn: rnConfig,
        htyf: rnConfig
      }
    })) as TransformResult

    callback(null, result.code ?? source, sourceMap)
  } catch (error) {
    callback(error instanceof Error ? error : new Error(String(error)))
  }
}
