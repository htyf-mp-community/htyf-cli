/**
 * 构建模块
 * 负责小程序和 Godot 游戏的打包构建
 * 
 * @module build
 */

import path from 'path';
import fse from 'fs-extra';
import AdmZip from 'adm-zip';
import QRCode from 'qrcode';
import { fileURLToPath } from 'node:url';
import { Logger } from './logger.mjs';
import { CONSTANTS } from './constants.mjs';
import { FileSystemUtils } from './file-system.mjs';
import { CommandExecutor } from './command-executor.mjs';
import { getMiniAppScriptId } from './utils-functions.mjs';
import { getProjectRoot, guessGodotProjectDir } from './utils.mjs';
import { exportGodot, promptGodotOptions } from './export_godot.mjs';

// 获取当前文件所在目录
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = getProjectRoot();

/**
 * 复制目录内容（不包含最外层目录名）
 * @param {string} srcDir
 * @param {string} destDir
 */
async function copyDirContents(srcDir, destDir) {
  await fse.ensureDir(destDir);
  const entries = await fse.readdir(srcDir);
  for (const entry of entries) {
    await fse.copy(path.join(srcDir, entry), path.join(destDir, entry), { overwrite: true });
  }
}

/**
 * 执行 Web 端 H5 构建
 * @param {'build'|'dev'} mode
 */
async function runWebH5Build(mode = 'build') {
  const cmd = mode === 'dev' ? 'npm run dev:h5' : 'npm run build:h5';
  Logger.info(`开始执行 Web H5 构建: ${cmd}`);
  await CommandExecutor.execute(cmd, {
    description: `Web H5 ${mode === 'dev' ? '开发' : '构建'}`,
    timeout: mode === 'dev' ? 120000 : 300000,
    showCommand: false,
  });
}

/**
 * 将 taro build:h5 的输出同步到最终 zip 目录
 *
 * 说明：
 * - taro 的 outputRoot 在模板里通常是 ./dist
 * - CLI 最终会把内容打包到 ./dist/dist（outputPath）
 * - 因此这里需要把 ./dist 下的 h5 静态产物复制到 ./dist/dist
 *
 * @param {string} projectDistRoot - taro 输出目录（一般为 ./dist）
 * @param {string} zipInputDir - zip 输入目录（一般为 ./dist/dist）
 */
async function syncWebH5Output(projectDistRoot, zipInputDir) {
  // 先清空 zip 输入目录，避免残留
  await fse.ensureDir(zipInputDir);
  await fse.emptyDir(zipInputDir);

  const h5Dir = path.join(projectDistRoot, 'h5');
  if (await fse.pathExists(h5Dir)) {
    Logger.info('检测到 taro H5 输出目录 ./dist/h5，复制其内容...');
    await copyDirContents(h5Dir, zipInputDir);
    return;
  }

  Logger.info('未检测到 ./dist/h5，尝试复制 ./dist 下的 H5 静态产物...');
  const entries = await fse.readdir(projectDistRoot);

  const excludeNames = new Set([
    'dist', // 避免递归复制 ./dist/dist
    'build', // RN bundle 输出目录
    'app.json',
    'manifest.json',
  ]);

  for (const entry of entries) {
    if (excludeNames.has(entry)) continue;
    if (entry.endsWith('.dgz')) continue;

    await fse.copy(path.join(projectDistRoot, entry), path.join(zipInputDir, entry), { overwrite: true });
  }
}

/**
 * 在构建输出目录生成二维码图片
 *
 * 优先使用 zipUrl，若为空则回退到 appUrlConfig。
 *
 * @param {string} outputPath - 构建输出目录
 * @param {object} appJson - 应用配置对象
 * @returns {Promise<void>}
 */
async function generateBuildQrCode(outputPath, appJson) {
  const qrContent = appJson?.zipUrl || appJson?.appUrlConfig;
  if (!qrContent) {
    Logger.warn('未配置 zipUrl/appUrlConfig，跳过二维码生成');
    return;
  }

  const qrFilePath = path.join(outputPath, 'qrcode.png');
  await QRCode.toFile(qrFilePath, qrContent, {
    width: 320,
    margin: 2
  });
  Logger.success(`二维码已生成: ${qrFilePath}`);
}

/**
 * 压缩文件夹为 ZIP 文件
 * 
 * 将指定目录压缩为 ZIP 格式，自动过滤 .map 文件（源码映射文件）
 * 
 * @param {string} inputPath - 要压缩的目录路径
 * @param {string} outputPath - 输出的 ZIP 文件路径
 * @returns {Promise<string>} 压缩包完整路径
 * @throws {Error} 当输入路径不存在或不是目录时抛出错误
 * 
 * @example
 * const zipPath = await handleZip('./dist', './dist.dgz');
 */
export async function handleZip(inputPath, outputPath) {
  Logger.info(`开始压缩文件夹: ${inputPath}`);
  Logger.info(`输出文件: ${outputPath}`);

  // 验证输入路径是否存在
  if (!(await fse.pathExists(inputPath))) {
    throw new Error(`输入路径不存在: ${inputPath}`);
  }

  // 验证是否为目录
  const stats = await fse.stat(inputPath);
  if (!stats.isDirectory()) {
    throw new Error(`输入路径不是目录: ${inputPath}`);
  }

  // 检查目录是否为空
  const files = await fse.readdir(inputPath);
  Logger.debug(`目录内容: ${files.length} 个文件/文件夹`);

  if (files.length === 0) {
    Logger.warn(`警告: 目录为空，将创建空的zip文件`);
  }

  const zipPath = outputPath;
  const admzip = new AdmZip();

  try {
    // 添加目录到 ZIP，过滤 .map 文件（源码映射文件，不需要打包）
    await admzip.addLocalFolderPromise(inputPath, {
      filter: (filename) => {
        if (filename.endsWith('.map')) {
          Logger.debug(`过滤文件: ${filename}`);
          return false;
        }
        Logger.debug(`添加文件: ${filename}`);
        return true;
      }
    });

    // 写入 ZIP 文件
    await admzip.writeZipPromise(zipPath);
    Logger.success(`压缩完成: ${zipPath}`);

    // 显示压缩包大小
    const zipStats = await fse.stat(zipPath);
    Logger.info(`ZIP文件大小: ${FileSystemUtils.formatFileSize(zipStats.size)}`);

    return zipPath;
  } catch (error) {
    Logger.error(`压缩失败: ${error.message}`);
    throw error;
  }
}

/**
 * 构建小程序包
 * 
 * 支持两种类型的项目构建：
 * 1. 普通小程序项目：使用 webpack 打包
 * 2. Godot 游戏项目：使用 Godot 导出工具打包
 * 
 * @param {object} newAppInfo - 应用信息对象
 * @param {string} newAppInfo.name - 应用名称
 * @param {string} newAppInfo.appid - 应用ID
 * @param {string} newAppInfo.version - 应用版本
 * @param {string} [newAppInfo.entry] - 入口文件（普通小程序必需）
 * @param {string} [newAppInfo.host] - 服务器地址
 * @param {string} [newAppInfo.appUrlConfig] - 应用配置URL
 * @param {string} [newAppInfo.zipUrl] - 压缩包URL
 * @param {boolean} [isGodot=false] - 是否为 Godot 项目
 * @returns {Promise<string>} 压缩包完整路径
 * @throws {Error} 当必需字段缺失或构建失败时抛出错误
 * 
 * @example
 * const zipPath = await mpBuildShell({
 *   name: '我的应用',
 *   appid: 'com.example.app',
 *   version: '1.0.0',
 *   entry: './src/index.js'
 * }, false);
 */
export async function mpBuildShell(newAppInfo, isGodot = false, buildOptions = {}) {
  Logger.info(`开始构建小程序包...`);
  Logger.info(`应用: ${newAppInfo.name}`);
  Logger.info(`应用ID: ${newAppInfo.appid}`);
  Logger.info(`版本: ${newAppInfo.version}`);
  Logger.info(`平台: ${CONSTANTS.BUNDLE_PLATFORM}`);
  Logger.info(`项目类型: ${isGodot ? 'Godot 游戏' : (newAppInfo?.type === 'web' ? 'Web 应用' : '普通小程序')}`);
  
  // ========== 参数验证 ==========
  if (!newAppInfo.name || !newAppInfo.appid || !newAppInfo.version) {
    throw new Error('缺少必需的应用信息: name, appid, version');
  }
  
  // ========== 目录准备 ==========
  // 创建临时目录（用于存放构建过程中的临时文件）
  const tempPath = CONSTANTS.TEMP_DIR;
  if (!FileSystemUtils.ensureDirectory(tempPath)) {
    throw new Error('无法创建临时目录');
  }

  // 创建输出目录（最终构建产物存放位置）
  const mpOutputPath = CONSTANTS.MP_OUTPUT_DIR;
  if (!FileSystemUtils.ensureDirectory(mpOutputPath)) {
    throw new Error('无法创建输出目录');
  }

  // ========== 应用配置准备 ==========
  const { version, appid } = newAppInfo;
  const scriptName = getMiniAppScriptId(appid, version);

  // 构建 app.json 配置
  const appType = newAppInfo.type || (isGodot ? 'game' : 'app');
  const isWeb = appType === 'web';
  const appJson = {
    ...newAppInfo,
    rotate: newAppInfo.rotate || 'portrait',
    type: appType,  // 支持 app / game / web 等类型
    engines: '2.0.0',
    name: newAppInfo.name,
    appid,
    version,
    appUrlConfig: newAppInfo.appUrlConfig || `${newAppInfo.host}/app.json`,
    zipUrl: newAppInfo.zipUrl || `${newAppInfo.host}/dist.dgz`
  };
  
  // 输出路径配置
  let outputPath = path.join(mpOutputPath, 'dist');  // 最终输出目录
  let distPackagePath = path.join(mpOutputPath, 'dist.dgz');  // 最终压缩包路径
  const rootIndexPath = path.join(tempPath, '..', 'index.js');
  // Webpack 构建选项（仅普通小程序使用）
  const mpOptions = {
    name: scriptName,
    filename: `${scriptName}.bundle`,
    exposes: {
      'App': newAppInfo.entry,
    },
    outputPath: path.join(mpOutputPath, 'build'),  // webpack 构建输出目录
    extraChunksPath: outputPath,
    manifest: path.join(mpOutputPath, 'manifest.json'),
  };
  Logger.info('mpOptions', mpOptions);

  const appJsonPath = path.join(mpOutputPath, 'app.json');
  // 注意：Web H5 构建会清理 ./dist，因此 app.json 写入要尽量晚一点
  if (!isWeb) {
    await fse.writeJson(appJsonPath, appJson, { spaces: 2 });
  }
  const webpackConfigPath = path.join(__dirname, 'webpack.config.mjs');

  // ========== 清空输出目录 ==========
  // 确保每次构建都是干净的状态，避免旧文件残留
  Logger.info('清空输出目录...');
  await fse.ensureDir(outputPath);
  await fse.emptyDir(outputPath);
  
  // 清空 webpack 构建目录
  // 如果 buildPath 是一个文件，先删除它，然后创建目录
  const buildPath = path.join(mpOutputPath, 'build');
  if (await fse.pathExists(buildPath)) {
    const stats = await fse.stat(buildPath);
    if (stats.isFile()) {
      // 如果是文件，删除它
      await fse.remove(buildPath);
      Logger.info(`已删除文件: ${buildPath}`);
    }
    // 确保是目录并清空
    await fse.ensureDir(buildPath);
    await fse.emptyDir(buildPath);
  } else {
    // 如果不存在，直接创建目录
    await fse.ensureDir(buildPath);
  }

  // ========== 执行构建 ==========
  try {
    if (!isGodot && !isWeb) {
      // ========== 普通小程序构建流程 ==========
      Logger.info('使用 React Native 构建小程序包...');
      
      // 计算 react-native CLI 路径
      const reactNativePath = path.resolve(__dirname, '../../../.bin/react-native');
      const entryFile = newAppInfo.entry
        ? path.resolve(PROJECT_ROOT, newAppInfo.entry)
        : rootIndexPath;
      const bundlePlatform = (CONSTANTS.BUNDLE_PLATFORM || 'ios').toLowerCase();
      const bundleOutput = path.join(mpOptions.extraChunksPath, `${scriptName}.${bundlePlatform}.jsbundle`);
      const assetsDest = path.join(mpOptions.extraChunksPath, 'assets');
      
      await fse.ensureDir(path.dirname(bundleOutput));
      await fse.ensureDir(assetsDest);
      
      const command = [
        'npx',
        'cross-env',
        `APP_ROOT_INDEX_PATH=${rootIndexPath}`,
        `APP_EXPOSES_OPTIONS=${encodeURI(JSON.stringify(mpOptions))}`,
        'node',
        reactNativePath,
        'bundle',
        '--entry-file',
        rootIndexPath,
        '--platform',
        bundlePlatform,
        '--dev',
        'false',
        '--reset-cache',
        '--minify',
        'false',
      ].join(' ');
      console.log('command', command);
      await CommandExecutor.execute(command, {
        description: '构建小程序包',
        timeout: 120000,  // 2 分钟超时
        showCommand: false
      });
    } else if (isGodot) {
      // ========== Godot 游戏构建流程 ==========
      Logger.info('检测到 Godot 项目，开始执行 Godot 导出流程...');
      
      // 根据平台常量确定默认平台
      const defaultPlatform = ['android', 'ios'].includes(CONSTANTS.BUNDLE_PLATFORM) 
        ? CONSTANTS.BUNDLE_PLATFORM 
        : 'ios';
      
      // 准备 Godot 导出选项的默认值
      const godotDefaults = {
        targetBaseDir: outputPath,
        projectDir: guessGodotProjectDir(PROJECT_ROOT),
        name: newAppInfo.appid || 'GodotApp',
        preset: defaultPlatform === 'android' ? 'Android' : 'iOS',
        platform: defaultPlatform
      };
      
      // 提示用户输入或确认 Godot 导出选项
      const godotOptions = await promptGodotOptions(godotDefaults);
      outputPath = path.resolve(godotOptions.targetBaseDir);
      await fse.ensureDir(outputPath);
      
      // 执行 Godot 导出
      await exportGodot(godotOptions);
      
      // Godot 项目使用平台特定的文件名（如 dist.ios.dgz 或 dist.android.dgz）
      const platformName = godotOptions.platform === 'ios' ? 'ios' : 'android';
      distPackagePath = path.join(mpOutputPath, `dist.${platformName}.dgz`);
      
      // 更新 app.json 中的 zipUrl
      appJson.zipUrl = newAppInfo.zipUrl || `${newAppInfo.host}/dist.${platformName}.dgz`;
      await fse.writeJson(appJsonPath, appJson, { spaces: 2 });
    } else if (isWeb) {
      // ========== Web 应用构建流程 ==========
      // 正式打包走 build:h5；真机调试可通过 buildOptions.skipWebBuild 跳过
      if (!buildOptions.skipWebBuild) {
        await runWebH5Build('build');
        await syncWebH5Output(mpOutputPath, outputPath);
      } else {
        Logger.info('跳过 Web H5 构建（debug 模式），仅打包 app.json');
        // 保证 zipInputDir 存在，后续还要写 app.json/qrcode
        await fse.ensureDir(outputPath);
        await fse.emptyDir(outputPath);
      }

      // Web 构建后再写 app.json，避免被 taro 清理掉
      await fse.writeJson(appJsonPath, appJson, { spaces: 2 });
    }

    // ========== 打包最终产物 ==========
    // 将 app.json 复制到输出目录
    await fse.ensureDir(outputPath);
    await fse.copy(appJsonPath, path.join(outputPath, 'app.json'));
    if (!isGodot && appType !== 'web') {
      fse.copyFileSync(path.join(outputPath, '../manifest.json'), path.join(outputPath, 'manifest.json'));
    }
    await generateBuildQrCode(outputPath, appJson);

    // 压缩输出目录为最终包
    const zipPath = await handleZip(outputPath, distPackagePath);
    Logger.success(`压缩包已创建: ${zipPath}`);
    return zipPath;
  } catch (error) {
    Logger.error(`小程序构建失败: ${error.message}`);
    throw error;
  }
}

