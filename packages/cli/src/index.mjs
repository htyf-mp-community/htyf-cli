#!/usr/bin/env node

/**
 * 红糖云服应用 CLI 工具主入口
 * 
 * 功能：
 * - 初始化新小程序项目
 * - 小程序打包构建
 * - 小程序真机调试
 * - 清理临时文件
 * 
 * 支持项目类型：
 * - 普通小程序项目（使用 webpack 构建）
 * - Godot 游戏项目（使用 Godot 导出工具）
 *
 * @author CLI Team
 * @version 2.2.0
 * @module index
 */

import inquirer from 'inquirer';
import path from 'path';
import chalk from 'chalk';
import { requireCjs } from './cjs.mjs';

const lodash = requireCjs('lodash');
const fse = requireCjs('fs-extra');
import boxen from 'boxen';
import gradient from 'gradient-string';
import { confirm } from '@inquirer/prompts';
import { getProjectRoot } from './utils.mjs';
import { Logger, setLogLevel } from './logger.mjs';
import { CONSTANTS, ACTION_TYPES, LOG_LEVELS } from './constants.mjs';
import { ProjectInitializer } from './project-initializer.mjs';
import { mpBuildShell } from './build.mjs';
import { mpDebugShell } from './debug.mjs';
import { cleanShell } from './clean.mjs';
import { syncDepsShell } from './sync-deps.mjs';
import { incrementVersion, updateAppConfig } from './utils-functions.mjs';

const projectPath = getProjectRoot();

// ========== 全局状态管理 ==========
// 用于优雅退出，避免重复退出操作
let isExiting = false;
let currentProcess = null;

/**
 * 优雅退出处理函数
 * 
 * 当收到退出信号（如 Ctrl+C）时：
 * 1. 尝试关闭正在运行的进程
 * 2. 延迟退出，给清理操作一些时间
 * 3. 如果已经在退出中，强制退出
 */
function handleGracefulExit() {
  if (isExiting) {
    // 如果已经在退出中，强制退出
    Logger.warn('强制退出...');
    process.exit(1);
  }

  isExiting = true;
  Logger.info('\n正在退出...');

  // 如果有正在运行的进程，尝试关闭
  if (currentProcess) {
    try {
      if (typeof currentProcess.close === 'function') {
        currentProcess.close();
      } else if (typeof currentProcess.kill === 'function') {
        currentProcess.kill('SIGTERM');
      }
    } catch (error) {
      Logger.debug(`关闭进程时出错: ${error.message}`);
    }
  }

  // 延迟退出，给清理操作一些时间
  setTimeout(() => {
    Logger.info('再见!');
    process.exit(0);
  }, 100);
}

// ========== 注册全局信号处理 ==========
// 使用 once 确保只注册一次
// 注意：某些模块（如 debug.mjs）可能会移除这些监听器并添加自己的处理
process.on('SIGINT', handleGracefulExit);   // Ctrl+C
process.on('SIGTERM', handleGracefulExit);  // 终止信号

/**
 * 主启动函数
 * 
 * 根据操作类型执行相应的功能：
 * - MP_BUILD: 构建小程序包
 * - MP_DEBUG: 启动真机调试服务器
 * - CLEAN: 清理临时文件
 * - QUIT: 退出程序
 * 
 * @param {string} action - 操作类型（ACTION_TYPES 中的值）
 */
async function Start(action) {
  const actionNames = {
    [ACTION_TYPES.MP_BUILD]: '小程序构建',
    [ACTION_TYPES.MP_DEBUG]: '小程序调试',
    [ACTION_TYPES.SYNC_DEPS]: '同步依赖版本',
    [ACTION_TYPES.CLEAN]: '清理模式',
    [ACTION_TYPES.QUIT]: '退出'
  };

  Logger.info(`当前操作: ${actionNames[action] || '未知操作'}`);

  // ========== 退出操作 ==========
  if (action === ACTION_TYPES.QUIT) {
    Logger.info('再见!');
    return;
  }

  // ========== 同步依赖版本 ==========
  if (action === ACTION_TYPES.SYNC_DEPS) {
    await syncDepsShell();
    return;
  }

  // ========== 清理操作 ==========
  if (action === ACTION_TYPES.CLEAN) {
    const { cleanType } = await inquirer.prompt([
      {
        type: 'list',
        name: 'cleanType',
        message: '请选择清理类型：',
        choices: [
          { name: '🧹 清理所有临时文件', value: 'all' },
          { name: '📁 清理构建输出', value: 'build' },
          { name: '🗂️  清理临时目录', value: 'temp' },
          { name: '📝 清理日志文件', value: 'logs' },
          { name: '💾 清理缓存文件', value: 'cache' },
          { name: '❌ 取消', value: 'cancel' }
        ]
      }
    ]);

    if (cleanType === 'cancel') {
      Logger.info('已取消清理操作');
      return;
    }

    const getCleanTypeName = (type) => {
      switch (type) {
        case 'all': return '所有';
        case 'build': return '构建输出';
        case 'temp': return '临时';
        case 'logs': return '日志';
        case 'cache': return '缓存';
        default: return type;
      }
    };

    const confirmClean = await confirm({
      message: `确定要清理${getCleanTypeName(cleanType)}文件吗？`,
      default: false
    });

    if (confirmClean) {
      await cleanShell(cleanType);
    } else {
      Logger.info('已取消清理操作');
    }
    return;
  }

  // ========== 构建/调试操作 ==========
  try {
    // 读取应用配置
    const appConfigPath = path.join(projectPath, 'app.json');
    const appInfo = fse.readJsonSync(appConfigPath).htyf;
    
    // 检测是否为 Godot 项目（通过检查是否存在 project.godot 文件）
    const isGodot = fse.existsSync(path.join(projectPath, 'project.godot'));
    Logger.info(`项目类型: ${isGodot ? 'Godot 游戏项目' : '普通小程序项目'}`);
    
    if (!appInfo) {
      Logger.error('应用配置不存在，请先在app.json中配置htyf');
      return;
    }
    
    // ========== 版本处理 ==========
    // 自动递增版本号作为默认值
    const version = appInfo?.version;
    const incrementedVersion = version ? incrementVersion(version) : '1.0.0';
    const { versionName } = await inquirer.prompt([
      {
        type: 'input',
        name: 'versionName',
        message: '请输入应用版本名称 (格式: x.y.z):',
        default: incrementedVersion,
        validate: (input) => {
          const _ipt = input || incrementedVersion;
          return (!!_ipt && /^\d+(\.\d+){2}$/g.test(_ipt)) || '请输入正确的版本名称格式 (x.y.z)';
        }
      },
    ]);

    Logger.info(`用户选择:`);
    Logger.info(`版本名称: ${versionName}`);

    // ========== 更新应用配置 ==========
    // 合并用户输入的版本号到应用信息中
    const newAppInfo = lodash.merge({}, appInfo, {
      version: versionName,
    });

    // 更新 app.json 文件
    if (!updateAppConfig(newAppInfo)) {
      return;
    }

    // ========== 显示应用信息 ==========
    console.log('\n' + boxen(
      chalk.cyan('应用信息') + '\n\n' +
      chalk.white('名称: ') + chalk.yellow(`${newAppInfo.name}`) + '\n' +
      chalk.white('版本: ') + chalk.yellow(`${newAppInfo.version}`),
      {
        padding: 1,
        margin: 1,
        borderStyle: 'round',
        borderColor: 'yellow'
      }
    ));

    Logger.info('开始执行操作...');

    // ========== 执行相应操作 ==========
    switch (action) {
      case ACTION_TYPES.MP_BUILD:
        // 构建小程序包
        await mpBuildShell(newAppInfo, isGodot);
        break;
      case ACTION_TYPES.MP_DEBUG:
        // 启动真机调试服务器
        await mpDebugShell(newAppInfo, isGodot);
        break;
      default:
        Logger.error(`未知的操作类型: ${action}`);
    }

  } catch (error) {
    Logger.error(`操作失败: ${error.message}`);
    Logger.error(`错误详情: ${error.stack}`);
  }
}

// ========== 主程序入口 ==========
// 显示欢迎信息
console.log('\n' + boxen(
  gradient.rainbow('🎯 红糖云服 应用 CLI 工具 v2.2.0') + '\n' +
  chalk.gray('用于管理多应用项目的开发、构建和部署') + '\n' +
  chalk.gray(`项目目录:`) + '\n\n' +
  chalk.gray(`${projectPath}`) + '\n',
  {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'cyan'
  }
));

// ========== 命令行参数处理 ==========

// 处理调试模式参数
if (process.argv.includes('--debug')) {
  setLogLevel(LOG_LEVELS.DEBUG);
  Logger.debug('调试模式已启用');
}

// 记录启动日志
Logger.writeToFile('CLI 工具启动', 'INFO');

// 处理依赖同步参数（命令行直接同步，不进入交互界面）
if (process.argv.includes('--sync-deps')) {
  await syncDepsShell({ skipConfirm: true });
  process.exit(0);
}

// 处理清理参数（命令行直接清理，不进入交互界面）
if (process.argv.includes('--clean')) {
  const cleanIndex = process.argv.indexOf('--clean');
  const cleanType = process.argv[cleanIndex + 1] || 'all';
  
  if (['all', 'build', 'temp', 'logs', 'cache'].includes(cleanType)) {
    Logger.info(`执行命令行清理: ${cleanType}`);
    await cleanShell(cleanType);
    process.exit(0);
  } else {
    Logger.error(`无效的清理类型: ${cleanType}`);
    Logger.error('支持的清理类型: all, build, temp, logs, cache');
    process.exit(1);
  }
}

// 显示帮助信息
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log('\n' + boxen(
    chalk.cyan('CLI 工具使用说明') + '\n\n' +
    chalk.white('基本用法:') + '\n' +
    chalk.gray('  node index.mjs                    # 启动交互式界面') + '\n' +
    chalk.gray('  node index.mjs --debug           # 启用调试模式') + '\n' +
    chalk.gray('  node index.mjs --help            # 显示帮助信息') + '\n\n' +
    chalk.white('清理命令:') + '\n' +
    chalk.gray('  node index.mjs --clean all       # 清理所有临时文件') + '\n' +
    chalk.gray('  node index.mjs --clean build     # 清理构建输出') + '\n' +
    chalk.gray('  node index.mjs --clean temp      # 清理临时目录') + '\n' +
    chalk.gray('  node index.mjs --clean logs      # 清理日志文件') + '\n' +
    chalk.gray('  node index.mjs --clean cache     # 清理缓存文件') + '\n\n' +
    chalk.gray('  node index.mjs --sync-deps       # 同步依赖版本') + '\n\n' +
    chalk.white('功能说明:') + '\n' +
    chalk.gray('  🆕 初始化新小程序项目 - 创建新的小程序项目') + '\n' +
    chalk.gray('  🔍 小程序打包 - 构建小程序包') + '\n' +
    chalk.gray('  📦 小程序调试 - 启动真机调试服务') + '\n' +
    chalk.gray('  🔄 同步依赖版本 - 将 package.json 依赖对齐 shared-output.json') + '\n' +
    chalk.gray('  🧹 清理模式 - 清理临时文件') + '\n',
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'blue'
    }
  ));
  process.exit(0);
}

inquirer
  .prompt([
    {
      type: 'rawlist',
      name: 'index',
      message: '请选择你想要执行的操作：',
      choices: [
        { name: '🆕 初始化新小程序项目', value: ACTION_TYPES.INIT },
        { name: '🔍 小程序 - 打包小程序', value: ACTION_TYPES.MP_BUILD },
        { name: '📦 小程序 - 真机调试', value: ACTION_TYPES.MP_DEBUG },
        { name: '🔄 同步依赖版本 - 对齐 shared-output.json', value: ACTION_TYPES.SYNC_DEPS },
        { name: '🧹 清理模式 - 清理临时文件', value: ACTION_TYPES.CLEAN },
        { name: '👋 退出', value: ACTION_TYPES.QUIT },
      ],
    },
  ])
  .then(async ({ index }) => {
    if (index === ACTION_TYPES.INIT) {
      const initializer = new ProjectInitializer();
      await initializer.initialize();
    } else {
      await Start(index);
    }
  })
  .catch((error) => {
    // 如果是用户取消（Ctrl+C），不显示错误
    if (error.isTtyError || error.name === 'AbortError') {
      handleGracefulExit();
      return;
    }
    Logger.error(`程序启动失败: ${error.message}`);
    if (!isExiting) {
      process.exit(1);
    }
  });
