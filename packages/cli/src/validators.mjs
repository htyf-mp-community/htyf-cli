import lodash from 'lodash';
import si from 'systeminformation';
import { Logger } from './logger.mjs';

/**
 * 配置验证工具类
 */
export class ConfigValidator {
  static validateAppConfig(config) {
    const errors = [];
    const warnings = [];

    // 必需字段检查
    const requiredFields = ['productName', 'versionName', 'versionCode'];
    requiredFields.forEach(field => {
      if (!config[field]) {
        errors.push(`缺少必需字段: ${field}`);
      }
    });

    // 平台配置检查
    if (config.iosBuild) {
      if (!config.iosBuild.appId) {
        warnings.push('iOS配置缺少appId');
      }
    }

    if (config.andBuild) {
      if (!config.andBuild.appId) {
        warnings.push('Android配置缺少appId');
      }
    }

    return { errors, warnings, isValid: errors.length === 0 };
  }

  static async validateNetworkConfig() {
    try {
      const networkInfo = await si.networkInterfaces();
      const defaultNet = (lodash.isArray(networkInfo) ? networkInfo : [networkInfo])
        .find(i => lodash.get(i, 'default', false));

      if (!defaultNet || !defaultNet.ip4) {
        return { isValid: false, error: '无法获取网络配置' };
      }

      return {
        isValid: true,
        host: defaultNet.ip4,
        interface: defaultNet.iface
      };
    } catch (error) {
      Logger.error(`网络配置验证失败: ${error.message}`);
      return { isValid: false, error: error.message };
    }
  }

  /**
   * 验证版本号格式
   * @param {string} versionName - 版本名称
   * @param {string} versionCode - 版本代码
   * @returns {boolean} 是否有效
   */
  static validateVersion(versionName, versionCode) {
    const VERSION_NAME_REGEX = /^\d+(\.\d+){2}$/g;
    const VERSION_CODE_REGEX = /^\d+$/g;
    
    const isVersionNameValid = VERSION_NAME_REGEX.test(versionName);
    const isVersionCodeValid = VERSION_CODE_REGEX.test(versionCode);

    if (!isVersionNameValid) {
      Logger.error(`版本名称格式错误: ${versionName}，应为 x.y.z 格式`);
    }

    if (!isVersionCodeValid) {
      Logger.error(`版本代码格式错误: ${versionCode}，应为数字格式`);
    }

    return isVersionNameValid && isVersionCodeValid;
  }
}

