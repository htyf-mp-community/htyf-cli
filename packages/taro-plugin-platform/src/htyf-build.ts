import * as fs from 'node:fs'
import * as path from 'node:path'
import chalk from 'chalk';
import * as fse from 'fs-extra'
import * as superstatic from 'superstatic'
import QRCode from 'qrcode';
import AdmZip from 'adm-zip';
import portfinder from 'portfinder';
import boxen from 'boxen';
import gradient from 'gradient-string';
import si from 'systeminformation';

export async function mpBuildShell(workspaceRoot: string, mode: 'debug' | 'build') {

  const packageInfo = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), {
    encoding: 'utf8'
  }))
  const projectConfig = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'htyf.config.json'), {
    encoding: 'utf8'
  }))
  const { version } = packageInfo
  const { appid, name, assetsHost } = projectConfig

  console.info(`开始构建小程序包...`);
  console.info(`应用: ${name}`);
  console.info(`应用ID: ${appid}`);
  console.info(`版本: ${version}`);
  console.info(`项目类型: app`);
  
  // ========== 参数验证 ==========
  if (!name || !appid || !version) {
    throw new Error('缺少必需的应用信息: name, appid, version');
  }
  
  // ========== 目录准备 ==========

  // 创建输出目录（最终构建产物存放位置）
  const mpInputPath = path.join(workspaceRoot, 'dist');
  const mpOutputPath = path.join(workspaceRoot, 'dist_htyf');
  await fse.remove(mpOutputPath)
  await fse.ensureDir(mpOutputPath)

  // 构建 app.json 配置
  const appType = 'app'
  const appJson = {
    rotate: 'portrait',
    type: appType,  // 支持 app / game / web 等类型
    engines: '2.0.0',
    name: name,
    appid,
    version,
    appUrlConfig: `${assetsHost}/app.json`,
    zipUrl: `${assetsHost}/dist.dgz`
  };
  
  // 输出路径配置
  let distConfigPath = path.join(mpOutputPath, 'app.json');  // 最终输出目录
  let distPackagePath = path.join(mpOutputPath, 'dist.dgz');  // 最终压缩包路径

  // ========== 清空输出目录 ==========
  // 确保每次构建都是干净的状态，避免旧文件残留
  console.info('清空输出目录...');
  
  // ========== 执行构建 ==========
  try {
 
    // ========== 打包最终产物 ==========
    // 将 app.json 复制到输出目录
    await fse.ensureDir(mpOutputPath);
    await fse.writeJson(path.join(workspaceRoot, '/dist/app.json'), appJson, { spaces: 2 });
    await fse.writeJson(path.join(mpOutputPath, 'app.json'), appJson, { spaces: 2 });
    try {
      fse.copyFileSync(path.join(workspaceRoot, 'dist/manifest.json'), path.join(mpOutputPath, 'manifest.json'));
    } catch (error) {
      
    }
    await generateBuildQrCode(mpOutputPath, appJson);

    // 压缩输出目录为最终包
    const zipPath = await handleZip(mpInputPath, distPackagePath);
    console.log(`压缩包已创建: ${zipPath}`);

    if (mode === 'debug') {
      // ========== 启动调试服务器 ==========
      const host = (await validateNetworkConfig())?.host;
      const port = await portfinder.getPortPromise();  // 自动查找可用端口

      const hostUrl = `http://${host}:${port}`;

      // 创建静态文件服务器
      const app = superstatic.server({
        port: port,
        // @ts-ignore
        address: host,
        cwd: mpOutputPath  // 服务器根目录
      });

      // 启动服务器
      app.listen(function () {
        // const address = server.address();

        // ========== 生成调试配置 ==========
        // 构建调试用的 URL
        const debugerAppUrlConfig = `${hostUrl}/app.json`;
        const debugerZip = `${hostUrl}/dist.dgz`;
        
        // 构建调试参数
        const args = {
          ...appJson,
          development: true,  // 标记为开发模式
          "name": appJson.name,
          "appid": appJson.appid,
          "version": appJson.version,
          appUrlConfig: debugerAppUrlConfig,
          zipUrl: debugerZip,
        };

        const debugerAppJson = {
          ...appJson,
          appUrlConfig: debugerAppUrlConfig,
          zipUrl: debugerZip,
        };

        // 更新 app.json 文件，写入调试 URL
        fse.writeJSONSync(`${distConfigPath}`, debugerAppJson);

        // 生成调试二维码 URL
        const qrcodeUrl = `https://share.dagouzhi.com/#/pages/index/index?data=${encodeURIComponent(JSON.stringify(debugerAppJson))}`;

        // ========== 显示调试信息 ==========
        console.log('\n');
        // @ts-ignore
        const _boxen = typeof boxen === 'function' ? boxen : boxen.default;
        // @ts-ignore
        const _chalk = typeof chalk.cyan === 'function' ? chalk : chalk.default;
        console.log(_boxen(
          gradient.rainbow('小程序真机调试') + '\n\n' +
          _chalk.cyan('服务器地址: ') + _chalk.white(`${hostUrl}`) + '\n' +
          _chalk.cyan('应用名称: ') + _chalk.white(appJson.name) + '\n' +
          _chalk.cyan('应用ID: ') + _chalk.white(appJson.appid) + '\n' +
          _chalk.cyan('版本: ') + _chalk.white(appJson.version),
          {
            padding: 1,
            margin: 1,
            borderStyle: 'round',
            borderColor: 'cyan'
          }
        ));

        // 显示调试配置 JSON
        console.log('\n' + _chalk.yellow('调试配置:'));
        console.log(JSON.stringify(args, undefined, 2));

        // 显示调试链接
        console.log('\n' + _chalk.green('调试链接:'));
        console.log(qrcodeUrl);

        // 显示二维码
        console.log('\n' + _chalk.blue('二维码:'));
        printQrcode(qrcodeUrl);

        console.info('调试服务器已启动，按 Ctrl+C 停止');
      });

    }
    return zipPath;
  } catch (error) {
    console.error(`小程序构建失败: ${error}`);
    throw error;
  }
}

export async function getAppExposesOptions(workspaceRoot: string) {
  const packageInfo = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), {
    encoding: 'utf8'
  }))
  const projectConfig = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'htyf.config.json'), {
    encoding: 'utf8'
  }))
  const { version } = packageInfo
  const { appid } = projectConfig
  const scriptName = getMiniAppScriptId(appid, version);
  const mpOptions = {
    name: scriptName,
    filename: `${scriptName}.bundle`,
    exposes: {
      "App": "@htyf-mp/taro-rn-supporter/entry-file.js"
    },
    outputPath: path.join(workspaceRoot, 'dist'),  // webpack 构建输出目录
    extraChunksPath: path.join(workspaceRoot, 'dist'),
    manifest: path.join(workspaceRoot, 'dist', 'manifest.json'),
  }
  return {
    APP_EXPOSES_OPTIONS: mpOptions,
    APP_ROOT_INDEX_PATH: path.join(workspaceRoot, 'index.js'),
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
async function generateBuildQrCode(outputPath: string, appJson: any) {
  const qrContent = appJson?.zipUrl || appJson?.appUrlConfig;
  if (!qrContent) {
    console.warn('未配置 zipUrl/appUrlConfig，跳过二维码生成');
    return;
  }

  const qrFilePath = path.join(outputPath, 'qrcode.png');
  await QRCode.toFile(qrFilePath, qrContent, {
    width: 320,
    margin: 2
  });
  console.log(`二维码已生成: ${qrFilePath}`);
}

export async function handleZip(inputPath, outputPath) {
  console.info(`开始压缩文件夹: ${inputPath}`);
  console.info(`输出文件: ${outputPath}`);

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
  console.debug(`目录内容: ${files.length} 个文件/文件夹`);

  if (files.length === 0) {
    console.warn(`警告: 目录为空，将创建空的zip文件`);
  }

  const zipPath = outputPath;
  const admzip = new AdmZip();

  try {
    // 添加目录到 ZIP，过滤 .map 文件（源码映射文件，不需要打包）
    await admzip.addLocalFolderPromise(inputPath, {
      filter: (filename) => {
        if (filename.endsWith('.map')) {
          console.debug(`过滤文件: ${filename}`);
          return false;
        }
        console.debug(`添加文件: ${filename}`);
        return true;
      }
    });

    // 写入 ZIP 文件
    await admzip.writeZipPromise(zipPath);
    console.log(`压缩完成: ${zipPath}`);

    // 显示压缩包大小
    const zipStats = await fse.stat(zipPath);
    console.info(`ZIP文件大小: ${(zipStats.size)}`);

    return zipPath;
  } catch (error) {
    console.error(`压缩失败: ${error}`);
    throw error;
  }
}

/**
 * 获取小程序脚本ID
 * @param {string} appid - 应用ID
 * @param {string} version - 版本号
 * @returns {string} 脚本ID
 */
export function getMiniAppScriptId(appid, version) {
  return `${appid}_v${version?.replace(/\./gi, '_')}`;
}

/**
 * 打印二维码
 * @param {string} url - 二维码URL
 */
export async function printQrcode(url: string) {
  try {
    let terminalStr = await QRCode.toString(url, { type: 'terminal', small: true });
    console.log(terminalStr);
  } catch (error) {
    console.error(`生成二维码失败: ${error}`);
  }
}


export async function validateNetworkConfig() {
  try {
    const networkInfo = await si.networkInterfaces();
    const defaultNet = networkInfo?.find(i => i.default);

    if (!defaultNet || !defaultNet.ip4) {
      return { isValid: false, error: '无法获取网络配置' };
    }

    return {
      isValid: true,
      host: defaultNet.ip4,
      interface: defaultNet.iface
    };
  } catch (error) {
    console.error(error)
  }
}