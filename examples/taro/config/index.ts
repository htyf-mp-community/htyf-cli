import path from 'path'
import { defineConfig, type UserConfigExport } from '@tarojs/cli'
import TsconfigPathsPlugin from 'tsconfig-paths-webpack-plugin'
import devConfig from './dev'
import prodConfig from './prod'

const projectRoot = path.resolve(__dirname, '..')

function resolvePkgDir(pkg: string, from = projectRoot) {
  return path.dirname(require.resolve(`${pkg}/package.json`, { paths: [from] }))
}

/**
 * 从 expo 的 pnpm 虚拟仓库解析配套包，避免 shamefully-hoist 把
 * expo@48 的 expo-modules-core@1.2.7 提升到仓库根 node_modules 后被误解析。
 */
function resolveFromExpo(pkg: string) {
  return resolvePkgDir(pkg, resolvePkgDir('expo'))
}

// https://taro-docs.jd.com/docs/next/config#defineconfig-辅助函数
export default defineConfig<'webpack5'>(async (merge, { command, mode }) => {
  let alias: any = {
    /**
     * 小程序 / H5 等 Webpack 构建固定使用 React 18
     * RN 和 HTFY 构建使用 React 19
     */
    'react': resolvePkgDir('react-18'),
    '@/*': path.join(__dirname, '../src/*'),
  }
  // @ts-ignore
  if (process.env.TARO_ENV === 'rn' || process.env.TARO_ENV === 'htyf') {
    const react19 = resolvePkgDir('react')
    // RN / htyf 必须显式钉到 React 19。删掉 alias 后 webpack 会走到仓库根的 React 18，
    // @tarojs/react 的 react-reconciler@0.29 再去读 ReactCurrentDispatcher 就会炸。
    alias['react'] = react19
    alias['@tarojs/react'] = react19
    alias['expo-modules-core'] = resolveFromExpo('expo-modules-core')
    // 仓库根 hoist 的是 demo-rn 的 13.8.0，原生 15.x 会派发 topSvgLayout，对不上就会崩
    alias['react-native-svg'] = resolvePkgDir('react-native-svg')
  }
  const baseConfig: UserConfigExport<'webpack5'> = {
    projectName: 'taro-playground',
    date: '2026-7-18',
    designWidth: 750,
    deviceRatio: {
      640: 2.34 / 2,
      750: 1,
      375: 2,
      828: 1.81 / 2
    },
    sourceRoot: 'src',
    outputRoot: 'dist',
    plugins: [
      "@tarojs/plugin-generator",
      '@htyf-mp/taro-plugin-platform'
    ],
    defineConstants: {
    },
    copy: {
      patterns: [
      ],
      options: {
      }
    },
    framework: 'react',
    compiler: 'webpack5',
    cache: {
      enable: false // Webpack 持久化缓存配置，建议开启。默认配置请参考：https://docs.taro.zone/docs/config-detail#cache
    },
    alias: {
      ...alias,
 

    },
    mini: {
      postcss: {
        pxtransform: {
          enable: true,
          config: {

          }
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
      }
    },
    h5: {
      publicPath: '/',
      staticDirectory: 'static',
      output: {
        filename: 'js/[name].[hash:8].js',
        chunkFilename: 'js/[name].[chunkhash:8].js'
      },
      miniCssExtractPluginOption: {
        ignoreOrder: true,
        filename: 'css/[name].[hash].css',
        chunkFilename: 'css/[name].[chunkhash].css'
      },
      postcss: {
        autoprefixer: {
          enable: true,
          config: {}
        },
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
          config: {
            namingPattern: 'module', // 转换模式，取值为 global/module
            generateScopedName: '[name]__[local]___[hash:base64:5]'
          }
        }
      },
      webpackChain(chain) {
        chain.resolve.plugin('tsconfig-paths').use(TsconfigPathsPlugin)
      }
    },
    htyf: {
      alias: {
        ...alias,
        'expo-modules-core': resolveFromExpo('expo-modules-core'),
      },
      appName: 'apps',
      entry: 'app',
      output: {},
      postcss: {
        cssModules: {
          enable: false, // 默认为 false，如需使用 css modules 功能，则设为 true
        },
        // postcss-pxtransform 不认识 htyf，必须用 rn，否则 px 会被转成 rpx 导致样式解析失败
        pxtransform: {
          enable: true,
          config: {
            platform: 'rn',
          },
        },
      }
    }
  }


  if (process.env.NODE_ENV === 'development') {
    // 本地开发构建配置（不混淆压缩）
    return merge({}, baseConfig, devConfig)
  }
  // 生产构建配置（默认开启压缩混淆等）
  return merge({}, baseConfig, prodConfig)
})
