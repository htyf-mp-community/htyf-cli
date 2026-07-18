/**
 * 调试模块
 * 负责启动小程序真机调试服务器
 * 
 * @module debug
 */

import path from 'path';
import fse from 'fs-extra';
import superstatic from 'superstatic';
import portfinder from 'portfinder';
import chalk from 'chalk';
import boxen from 'boxen';
import gradient from 'gradient-string';
import { Logger } from './logger.mjs';
import { CONSTANTS } from './constants.mjs';
import { ConfigValidator } from './validators.mjs';
import { mpBuildShell } from './build.mjs';
import { printQrcode } from './utils-functions.mjs';
import { spawn } from 'node:child_process';

/**
 * 等待 Web H5 首次编译产物就绪，避免 taro watch 后续清理 dist
 * 导致最终缺少 dist/app.json 与 dist/dist.dgz。
 *
 * @param {{timeoutMs?: number, intervalMs?: number}} [options]
 * @returns {Promise<boolean>}
 */
async function waitForWebH5Output(options = {}) {
  const { timeoutMs = 120000, intervalMs = 1000 } = options;
  const h5Dir = path.join(CONSTANTS.MP_OUTPUT_DIR, 'h5'); // ./dist/h5

  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await fse.pathExists(h5Dir)) {
      try {
        const entries = await fse.readdir(h5Dir);
        if (entries.length > 0) return true;
      } catch (_) {
        // directory may be in flux
      }
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return false;
}

/**
 * 小程序真机调试
 * 
 * 功能流程：
 * 1. 构建小程序包
 * 2. 验证网络配置
 * 3. 启动本地调试服务器
 * 4. 生成调试二维码
 * 
 * @param {object} newAppInfo - 应用信息
 * @param {string} newAppInfo.name - 应用名称
 * @param {string} newAppInfo.appid - 应用ID
 * @param {string} newAppInfo.version - 应用版本
 * @param {string} [newAppInfo.entry] - 入口文件（普通小程序必需，Godot 项目不需要）
 * @param {boolean} [isGodot=false] - 是否为 Godot 项目
 * @throws {Error} 当必需字段缺失或网络配置验证失败时抛出错误
 * 
 * @example
 * await mpDebugShell({
 *   name: '我的应用',
 *   appid: 'com.example.app',
 *   version: '1.0.0',
 *   entry: './src/index.js'
 * }, false);
 */
export async function mpDebugShell(newAppInfo, isGodot = false) {
  try {
    // ========== 参数验证 ==========
    // Godot 项目不需要 entry 字段，Web 类型也不需要；
    // 仅普通小程序（非 Godot 且非 Web）需要 entry
    const isWeb = newAppInfo.type === 'web';
    if (!isGodot && !isWeb && !newAppInfo.entry) {
      throw new Error('缺少必需的应用信息: entry');
    }
    let devH5Process = null;
    if (isWeb) {
      // devH5Process = spawn('npm', ['run', 'dev:h5'], {
      //   stdio: 'inherit',
      //   shell: true,
      // });
    }

    // Web 真机调试：等待 taro 首次编译产物就绪
    // 这样后续生成的 dist/app.json 与 dist/dist.dgz 不容易被覆盖/删除。
    if (isWeb) {
      Logger.info('等待 Web H5 首次编译完成...');
      const ok = await waitForWebH5Output();
      if (!ok) {
        Logger.warn('等待 Web H5 产物超时，将继续生成调试用 dist 资源');
      }
    }

    // ========== 构建小程序包 ==========
    Logger.info('开始构建小程序包...');
    const zipPath = await mpBuildShell(newAppInfo, isGodot, { skipWebBuild: isWeb });
    const assetsPath = path.dirname(zipPath);
    const appJsonPath = path.join(assetsPath, 'app.json');

    Logger.info(`资源路径: ${assetsPath}`);
    const applocaljson = fse.readJsonSync(appJsonPath);

    // ========== 网络配置验证 ==========
    const networkValidation = await ConfigValidator.validateNetworkConfig();
    if (!networkValidation.isValid) {
      throw new Error(`网络配置验证失败: ${networkValidation.error}`);
    }

    // ========== 启动调试服务器 ==========
    const host = networkValidation.host;
    const port = await portfinder.getPortPromise();  // 自动查找可用端口

    // Web 真机调试：启动 H5 dev server，并把固定地址写入打包后的 app.json 的 webUrl
    // 注意：dev:h5 由 taro 侧负责启动静态服务（这里只启动命令并在 app.json 写死 URL）
    const webDevUrl = process.env.WEB_H5_DEV_URL || 'http://192.168.1.28:10086';
    

    // 创建静态文件服务器
    const app = superstatic.server({
      port: port,
      address: host,
      cwd: assetsPath  // 服务器根目录
    });

    // 启动服务器
    const server = app.listen(function () {
      const address = server.address();

      // ========== 生成调试配置 ==========
      // 构建调试用的 URL
      const debugerAppUrlConfig = `http://${host}:${address.port}/app.json`;
      const debugerZip = `http://${host}:${address.port}/dist.dgz`;
      
      // 构建调试参数
      const args = {
        ...applocaljson,
        development: true,  // 标记为开发模式
        "name": applocaljson.name,
        "appid": applocaljson.appid,
        "version": applocaljson.version,
        appUrlConfig: debugerAppUrlConfig,
        zipUrl: debugerZip,
        ...(isWeb ? { webUrl: webDevUrl } : {}),
      };

      // 更新 app.json 文件，写入调试 URL
      fse.writeJSONSync(appJsonPath, {
        ...fse.readJSONSync(appJsonPath),
        appUrlConfig: debugerAppUrlConfig,
        zipUrl: debugerZip,
        ...(isWeb ? { webUrl: webDevUrl } : {}),
      });

      // 生成调试二维码 URL
      const qrcodeUrl = `https://share.dagouzhi.com/#/pages/index/index?data=${encodeURIComponent(JSON.stringify(args))}`;

      // ========== 显示调试信息 ==========
      console.log('\n');
      console.log(boxen(
        gradient.rainbow('小程序真机调试') + '\n\n' +
        chalk.cyan('服务器地址: ') + chalk.white(`${host}:${address.port}`) + '\n' +
        chalk.cyan('应用名称: ') + chalk.white(applocaljson.name) + '\n' +
        chalk.cyan('应用ID: ') + chalk.white(applocaljson.appid) + '\n' +
        chalk.cyan('版本: ') + chalk.white(applocaljson.version),
        {
          padding: 1,
          margin: 1,
          borderStyle: 'round',
          borderColor: 'cyan'
        }
      ));

      // 显示调试配置 JSON
      console.log('\n' + chalk.yellow('调试配置:'));
      console.log(JSON.stringify(args, undefined, 2));

      // 显示调试链接
      console.log('\n' + chalk.green('调试链接:'));
      console.log(qrcodeUrl);

      // 显示二维码
      console.log('\n' + chalk.blue('二维码:'));
      printQrcode(qrcodeUrl);

      Logger.info('调试服务器已启动，按 Ctrl+C 停止');
    });

    // ========== 优雅关闭处理 ==========
    // 移除全局的信号处理，添加专用的服务器关闭处理
    // 这样可以确保服务器能够正确关闭，避免资源泄漏
    const handleShutdown = () => {
      Logger.info('\n正在关闭调试服务器...');
      let isClosed = false;

      // 优先停止 Web H5 dev server（debug 进程）
      if (devH5Process) {
        try {
          // detached 后它会成为新的进程组 leader，使用负 pid 可杀整个组
          process.kill(-devH5Process.pid, 'SIGTERM');
        } catch (e) {
          try {
            devH5Process.kill('SIGTERM');
          } catch (_) {
            // ignore
          }
        }
      }
      
      // 尝试关闭服务器
      server.close(() => {
        if (!isClosed) {
          isClosed = true;
          Logger.success('调试服务器已关闭');
          process.exit(0);
        }
      });
      
      // 如果服务器在 3 秒内没有关闭，强制退出
      // 防止服务器关闭卡死导致进程无法退出
      setTimeout(() => {
        if (!isClosed) {
          isClosed = true;
          Logger.warn('强制退出...');
          process.exit(0);
        }
      }, 3000);
    };

    // 注册信号处理器
    // 移除可能存在的全局处理器，避免冲突
    process.removeAllListeners('SIGINT');
    process.removeAllListeners('SIGTERM');
    process.once('SIGINT', handleShutdown);   // Ctrl+C
    process.once('SIGTERM', handleShutdown);  // 终止信号

  } catch (error) {
    Logger.error(`小程序调试失败: ${error.message}`);
    process.exit(1);
  }
}

