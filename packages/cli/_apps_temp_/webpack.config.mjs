// 导入Node.js和第三方依赖
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fse from 'fs-extra';
import webpack from 'webpack';
import TerserPlugin from 'terser-webpack-plugin';
import * as Repack from '@callstack/repack';
import { ExpoModulesPlugin } from '@callstack/repack-plugin-expo-modules';
import { ReanimatedPlugin } from '@callstack/repack-plugin-reanimated';
import { HtyfModulesPlugin } from '@htyf-mp/cli/src/HtyfImportsPlugin.mjs';


// 获取当前文件和目录路径
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 微前端暴露配置，通常为JSON字符串
const appExposesOptions = process.env.APP_EXPOSES_OPTIONS;

// 读取package.json，获取应用基本信息
const pkg = fse.readJsonSync(path.join(__dirname, './package.json'));
// 读取依赖共享配置
const dependencies = fse.readJsonSync(path.join(__dirname, 'node_modules/@htyf-mp/cli/src/shared-output.json'));

// 记录构建时间戳
const time = Date.now();

const version = process.env.APP_VERSION;
const appid = process.env.APP_ID;

// 构建Module Federation共享依赖对象
const sharedObj = {};
for (const key in dependencies) {
  const version = dependencies[key];
  sharedObj[key] = {
    /** 是否运行为单例 */
    singleton: true,
    /** host模式下必须为true，微应用为false */
    // eager: true,
    eager: true,
    version: `${version}`,
  };
}

/**
 * Webpack配置导出函数
 * @param {object} env - 构建环境变量
 * @returns {object} - Webpack配置对象
 */
export default (env = {}) => {
  // 设置构建上下文
  // env.context = __dirname;
  const { entry = './index.js', platform = 'ios' } = env;
  const context = env.context || __dirname;
  // 获取Repack的resolve配置
  const _options = Repack.getResolveOptions();

  // 解析微前端相关配置
  let mpOptions = {};
  if (appExposesOptions) {
    mpOptions = JSON.parse(decodeURI(appExposesOptions));
  }
  console.log('\n');
  console.log('=====mpOptions=====');
  console.log('\n');
  console.log('context:', context);
  console.log('\n');
  console.log('entry:', entry);
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
    },
    output: {
      // 默认输出路径，host模式下会被覆盖
      path: path.join(__dirname, 'build', 'host-app', platform),
      uniqueName: 'HTYF-HostApp',
    },
    module: {
      rules: [
        // 处理js/ts/tsx文件，使用babel-loader
        {
          test: /\.[cm]?[jt]sx?$/,
          use: 'babel-loader',
          type: 'javascript/auto',
        },
        // 处理静态资源（图片等），支持inline模式
        ...Repack.getAssetTransformRules(!!mpOptions.extraChunksPath ?  {
          inline: !!mpOptions.extraChunksPath,
          svg: 'svgr',
        } : {
          svg: "svgr",
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
      new Repack.RepackPlugin(mpOptions.extraChunksPath ? {
        platform,
        extraChunks: [
          {
            include: /.*/,
            type: 'remote',
            outputPath: `${mpOptions.extraChunksPath}`,
          },
        ],
      } : {
        platform,
      }),
      // Expo模块支持
      new ExpoModulesPlugin(),
      // Reanimated支持
      new ReanimatedPlugin(),
      // Module Federation V2插件，支持host和remote两种模式
      new Repack.plugins.ModuleFederationPluginV2(mpOptions.exposes ? {
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
      } : {
        dts: false,
        // host模式
        name: 'HTYF_HOST_APP',
        remotes: {},
        shared: {
          ...sharedObj,
          react: { singleton: true, eager: true },
          'react-native': { singleton: true, eager: true },
        },
        shareStrategy: 'loaded-first',
      }),
    ],
  };

  // 如果是微应用（remote），覆盖输出路径并限制chunk数量
  if (mpOptions.name) {
    mpConfig.plugins.push(
      new HtyfModulesPlugin({
        codeSigning: true,
        appid: mpOptions.appid,
        version: mpOptions.version,
        manifest: mpOptions.manifest,
      }),
    );
    mpConfig.plugins.push(
      new webpack.optimize.LimitChunkCountPlugin({
        maxChunks: 2, // 限制最大chunk数，便于远程加载
      })
    );
    mpConfig.output = {
      path: mpOptions.outputPath,
      // uniqueName: mpOptions.name, // 如需唯一名可取消注释
    };
  }

  return mpConfig;
};