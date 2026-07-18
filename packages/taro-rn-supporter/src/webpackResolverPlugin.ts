import * as path from 'node:path'

import { entryFilePath } from './defaults'
import { resolveExtFile, resolvePathFromAlias } from './utils'

import type { IProjectConfig } from '@tarojs/taro/types/compile'

interface WebpackResolverRequest {
  context?: {
    issuer?: string
  }
  path?: string
  request?: string
  __taroWebpackResolverPlugin?: boolean
}

interface WebpackResolver {
  doResolve: (
    hook: unknown,
    request: WebpackResolverRequest,
    message: string,
    resolveContext: unknown,
    callback: (error?: Error | null, result?: unknown) => void
  ) => void
  ensureHook: (name: string) => unknown
  getHook: (name: string) => {
    tapAsync: (
      name: string,
      handler: (
        request: WebpackResolverRequest,
        resolveContext: unknown,
        callback: (error?: Error | null, result?: unknown) => void
      ) => void
    ) => void
  }
}

interface WebpackResolverPluginOptions {
  config: IProjectConfig
  platform: string
  projectRoot: string
}

const PLUGIN_NAME = 'TaroWebpackResolverPlugin'

/**
 * 将 Taro RN 的 alias 和平台文件解析规则接入 Webpack enhanced-resolve。
 */
export class TaroWebpackResolverPlugin {
  private readonly config: IProjectConfig
  private readonly platform: string
  private readonly projectRoot: string

  constructor ({ config, platform, projectRoot }: WebpackResolverPluginOptions) {
    this.config = config
    this.platform = platform
    this.projectRoot = projectRoot
  }

  apply (resolver: WebpackResolver) {
    const target = resolver.ensureHook('resolve')

    resolver.getHook('described-resolve').tapAsync(
      PLUGIN_NAME,
      (request, resolveContext, callback) => {
        const moduleName = request.request
        if (!moduleName || request.__taroWebpackResolverPlugin) {
          return callback()
        }

        const issuer = request.context?.issuer ||
          (request.path ? path.join(request.path, 'index.js') : '')
        const normalizedIssuer = issuer.replace(/\\/g, '/')
        const isEntryFile = normalizedIssuer.endsWith(entryFilePath)
        const originModulePath = isEntryFile
          ? path.join(this.projectRoot, 'index.js')
          : issuer
        const aliasModuleName = resolvePathFromAlias(moduleName, this.config)
        const resolvedModuleName = resolveExtFile(
          { originModulePath },
          aliasModuleName,
          this.platform,
          this.config
        )

        if (resolvedModuleName === moduleName) {
          return callback()
        }

        const nextRequest = {
          ...request,
          request: resolvedModuleName,
          __taroWebpackResolverPlugin: true
        }
        const message = `${PLUGIN_NAME}: ${moduleName} -> ${resolvedModuleName}`

        return resolver.doResolve(
          target,
          nextRequest,
          message,
          resolveContext,
          callback
        )
      }
    )
  }
}
