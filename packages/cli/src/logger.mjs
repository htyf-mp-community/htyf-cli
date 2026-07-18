import chalk from 'chalk';
import fse from 'fs-extra';
import path from 'path';
import fs from 'fs';
import { CONSTANTS, LOG_LEVELS } from './constants.mjs';

// 当前日志级别
let currentLogLevel = LOG_LEVELS.INFO;

/**
 * 设置日志级别
 * @param {number} level - 日志级别
 */
export function setLogLevel(level) {
  currentLogLevel = level;
}

/**
 * 获取当前日志级别
 * @returns {number} 当前日志级别
 */
export function getLogLevel() {
  return currentLogLevel;
}

/**
 * 日志工具类
 */
export class Logger {
  static debug(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.DEBUG) {
      console.log(chalk.gray(`[DEBUG] ${message}`), ...args);
    }
  }

  static info(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.INFO) {
      console.log(chalk.blue(`[INFO] ${message}`), ...args);
    }
  }

  static warn(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.WARN) {
      console.log(chalk.yellow(`[WARN] ${message}`), ...args);
    }
  }

  static error(message, ...args) {
    if (currentLogLevel <= LOG_LEVELS.ERROR) {
      console.log(chalk.red(`[ERROR] ${message}`), ...args);
    }
  }

  static success(message, ...args) {
    console.log(chalk.green(`[SUCCESS] ${message}`), ...args);
  }

  static writeToFile(message, level = 'INFO') {
    const logDir = CONSTANTS.LOGS_DIR;
    const logFile = path.join(logDir, `cli-${new Date().toISOString().split('T')[0]}.log`);

    try {
      fse.ensureDirSync(logDir);
      const timestamp = new Date().toISOString();
      const logEntry = `[${timestamp}] [${level}] ${message}\n`;
      fs.appendFileSync(logFile, logEntry);
    } catch (error) {
      console.error('写入日志文件失败:', error.message);
    }
  }
}

