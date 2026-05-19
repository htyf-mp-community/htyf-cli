import path from 'path';
import { getProjectRoot } from './utils.mjs';

const projectPath = getProjectRoot();

/**
 * CLI 工具常量定义
 */
export const CONSTANTS = {
  SRC_DIR: path.join(projectPath, './src'),
  TEMP_DIR: path.join(projectPath, './.htyf'),
  MP_OUTPUT_DIR: path.join(projectPath, './dist'),
  LOGS_DIR: path.join(projectPath, './.htyf/.logs'),
  DEFAULT_VERSION_NAME: '1.0.0',
  DEFAULT_VERSION_CODE: '1',
  VERSION_NAME_REGEX: /^\d+(\.\d+){2}$/g,
  VERSION_CODE_REGEX: /^\d+$/g,
  WEBPACK_PORT: 8081,
  BUNDLE_ENTRY_FILE: 'index.js',
  BUNDLE_PLATFORM: 'ios',
  MAX_RETRY_COUNT: 3,
  DEFAULT_TIMEOUT: 30000,
  TEMPLATE_REPOS: {
    GITHUB: 'https://github.com/htyf-mp-community/htyf-cli.git',
    CODING: 'https://e.coding.net/dagouzhi/hongtangyun_mobile/htyf-cli.git'
  },
  TEMPLATE_TYPES: {
    APP_TEMPLATE: 'app-template',
    GAME_TEMPLATE: 'game-template',
    WEB_TEMPLATE: 'web-template',
  }
};

/**
 * 操作类型枚举
 */
export const ACTION_TYPES = {
  START: 'start',
  INIT: 'init',
  MP_BUILD: 'mp-build',
  MP_DEBUG: 'mp-debug',
  CLEAN: 'clean',
  QUIT: 'quit'
};

/**
 * 日志级别枚举
 */
export const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3
};

