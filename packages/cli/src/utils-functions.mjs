import path from 'path';
import fs from 'fs';
import fse from 'fs-extra';
import { Logger } from './logger.mjs';
import { CONSTANTS } from './constants.mjs';
import { getProjectRoot } from './utils.mjs';

const projectPath = getProjectRoot();

/**
 * 版本号递增函数
 * @param {string} version - 当前版本号 (格式: x.y.z)
 * @returns {string} - 递增后的版本号
 */
export function incrementVersion(version) {
  if (!version || !CONSTANTS.VERSION_NAME_REGEX.test(version)) {
    return CONSTANTS.DEFAULT_VERSION_NAME;
  }
  
  const parts = version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1; // 补丁版本号加1
  
  return parts.join('.');
}

/**
 * 更新应用配置
 * @param {object} newConfig - 新配置对象
 * @returns {boolean} 是否成功
 */
export function updateAppConfig(newConfig) {
  try {
    const configPath = path.join(projectPath, 'app.json');
    const localConfig = fse.readJsonSync(configPath);
    const _newConfig = {
      ...localConfig,
      'htyf': {
        ...localConfig.htyf,
        ...newConfig
      }
    }

    fs.writeFileSync(configPath, JSON.stringify(_newConfig, undefined, 2), 'utf-8');
    Logger.success(`配置文件已更新: ${configPath}`);

    return true;
  } catch (error) {
    Logger.error(`更新配置文件失败: ${error.message}`);
    return false;
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
export async function printQrcode(url) {
  try {
    const QRCode = await import('qrcode');
    let terminalStr = await QRCode.toString(url, { type: 'terminal', small: true });
    console.log(terminalStr);
  } catch (error) {
    Logger.error(`生成二维码失败: ${error.message}`);
  }
}

