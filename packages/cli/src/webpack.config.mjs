// 导入Node.js和第三方依赖
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import * as Repack from '@callstack/repack';
import { ExpoModulesPlugin } from '@callstack/repack-plugin-expo-modules';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import { HtyfModulesPlugin } from '@htyf-mp/cli/HtyfImportsPlugin.mjs';
import { getProjectRoot } from './utils.mjs';

// 获取当前文件和目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 微前端暴露配置，通常为JSON字符串
const appExposesOptions = process.env.APP_EXPOSES_OPTIONS;
const appRootIndexPath = process.env.APP_ROOT_INDEX_PATH;

// 读取依赖共享配置
const dependencies = fse.readJsonSync(path.join(__dirname, './shared-output.json'));

// 记录构建时间戳
const time = Date.now();

const version = process.env.APP_VERSION;
const appid = process.env.APP_ID;

// 构建Module Federation共享依赖对象
const sharedObj = {};
for (const key in dependencies) {
  const p = dependencies[key];
  sharedObj[key] = {
    /** 是否运行为单例 */
    singleton: true,
    /** host模式下必须为true，微应用为false */
    eager: true,
    version: p.version,
  };
}

const projectRoot = getProjectRoot();

/**
 * Webpack配置导出函数
 * @param {object} env - 构建环境变量
 * @returns {object} - Webpack配置对象
 */
export default (env = {}) => {
  // 设置构建上下文
  env.context = projectRoot || __dirname;
  const { entry = appRootIndexPath, platform = 'ios' } = env;
  const context = env.context || __dirname;
  // 获取Repack的resolve配置
  const _options = Repack.getResolveOptions();

  // 解析微前端相关配置
  let mpOptions = {};
  if (appExposesOptions) {
    mpOptions = JSON.parse(decodeURI(appExposesOptions));
  }
  
  // 处理 exposes 路径，确保路径正确解析
  // Module Federation 需要相对于 context 的路径，如果路径不以 ./ 开头，需要添加
  if (mpOptions.exposes) {
    const processedExposes = {};
    for (const [key, value] of Object.entries(mpOptions.exposes)) {
      // 如果路径不是绝对路径且不以 ./ 开头，添加 ./ 前缀
      if (value && typeof value === 'string' && !path.isAbsolute(value) && !value.startsWith('./') && !value.startsWith('../')) {
        processedExposes[key] = `./${value}`;
      } else {
        processedExposes[key] = value;
      }
    }
    mpOptions.exposes = processedExposes;
  }
  
  console.log('\n');
  console.log('=====mpOptions (after processing)=====');
  console.log('\n');
  console.log('context:', projectRoot);
  console.log('\n');
  console.log('entry:', entry);
  console.log('\n');
  console.log('exposes (processed):', JSON.stringify(mpOptions.exposes, null, 2));
  console.log('\n');
  console.log(JSON.stringify(mpOptions, null, 2));
  console.log('\n');
  console.log('=====mpOptions=====');
  console.log('\n');
  // 基础Webpack配置
  const mpConfig = {
    context,
    entry,
    resolve: {
      ..._options,
      // 确保扩展名解析正确
      extensions: ['.tsx', '.ts', '.jsx', '.js', '.json', ...(_options.extensions || [])],
    },
    output: {
      // 默认输出路径，host模式下会被覆盖
      path: mpOptions.outputPath,
      publicPath: mpOptions.outputPath,
      // uniqueName: `htyf_mp_for_${mpOptions.name}`,
    },
    module: {
      rules: [
        // 处理js/ts/tsx文件，使用babel-loader
        {
          test: /\.[cm]?[jt]sx?$/,
          use: {
            loader: 'babel-loader',
            // options: {
            //   configFile: path.resolve(__dirname, './babel.config.js'),
            // }
          },
          type: 'javascript/auto',
        },
        // 处理静态资源（图片等），支持inline模式
        ...Repack.getAssetTransformRules({
          inline: !!mpOptions.extraChunksPath,
          svg: 'xml',
        }),
      ],
    },
    optimization: {
      // 压缩配置，去除注释
      minimizer: [
        new TerserPlugin({
          test: /\.(js)?bundle(\?.*)?$/i,
          extractComments: false,
          terserOptions: {
            format: {
              comments: false,
            },
          },
        }),
      ],
      chunkIds: 'named', // 便于调试
    },
    plugins: [
      // 注入全局常量（appid、版本、构建时间）
      new webpack.DefinePlugin({
        __APP_DEFINE_APPID__: `"${appid}"`,
        __APP_DEFINE_VERSION__: `"${version}"`,
        __APP_DEFINE_BUILD_TIME__: `"${time}"`,
      }),
      // Repack主插件，支持extraChunks配置
      new Repack.RepackPlugin({
        platform,
        extraChunks: mpOptions.extraChunksPath ? [
          {
            // 排除 remoteEntry chunk，让它保留在 output.path 中供 Manifest Plugin 使用
            // remoteEntry 文件名由 ModuleFederationPluginV2 的 filename 配置决定
            // 使用 exclude 排除 remoteEntry，其他 chunk 输出到 extraChunksPath
            exclude: mpOptions.filename ? new RegExp(`^${mpOptions.filename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`) : /^remoteEntry/,
            include: /.*/,
            type: 'remote',
            outputPath: `${mpOptions.extraChunksPath}`,
          },
        ] : undefined,
      }),
      // Expo模块支持
      new ExpoModulesPlugin(),
      // Reanimated支持
      new ReanimatedPlugin(),
      // Module Federation V2插件，支持host和remote两种模式
      new Repack.plugins.ModuleFederationPluginV2({
        dts: false,
        // 微应用模式
        name: mpOptions.name,
        filename: mpOptions.filename,
        exposes: mpOptions.exposes,
        shared: {
          ...sharedObj,
          react: { singleton: true, eager: true },
          'react-native': { singleton: true, eager: true },
        },
        shareStrategy: 'loaded-first',
      }),
      new HtyfModulesPlugin({
        codeSigning: true,
        appid: mpOptions.appid,
        version: mpOptions.version,
        manifest: mpOptions.manifest,
      }),
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 2, // 限制最大chunk数，便于远程加载
      })
    ],
  };

  return mpConfig;
};