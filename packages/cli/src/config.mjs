import md5 from 'md5';
import { v4 as uuidv4 } from 'uuid';
import { CONSTANTS } from './constants.mjs';

/**
 * 项目初始化配置类
 */
export class ProjectConfig {
  constructor() {
    this.validators = {
      appName: /^([a-z]+)(-[a-z0-9]+)*$/,
      displayName: /^[\u4e00-\u9fa5a-zA-Z0-9]{2,10}$/
    };

    this.templates = {
      [CONSTANTS.TEMPLATE_TYPES.TARO_TEMPLATE]: {
        name: 'taro-template',
        tempPath: '_taro_temp_'
      },
      [CONSTANTS.TEMPLATE_TYPES.APP_TEMPLATE]: {
        name: 'app-template',
        tempPath: '_apps_temp_'
      },
      [CONSTANTS.TEMPLATE_TYPES.GAME_TEMPLATE]: {
        name: 'game-template',
        tempPath: '_game_temp_'
      },
    };
  }

  validateAppName(name) {
    return this.validators.appName.test(name);
  }

  validateDisplayName(name) {
    return this.validators.displayName.test(name);
  }

  generateAppId() {
    // 生成唯一的 UUID，然后转换为 MD5
    // 使用时间戳和随机数确保唯一性
    const timestamp = Date.now();
    const randomUuid = uuidv4();
    const uniqueString = `${timestamp}-${randomUuid}`;
    return `htyfapp${md5(uniqueString)}`;
  }

  createProjectConfig(appName, displayName, appid, rotate) {
    return {
      type: 'app',
      name: appName,
      rotate: rotate || 'portrait',
      projectname: displayName,
      appid: appid,
      appUrlConfig: 'https://xxxxx/app.json',
      zipUrl: 'https://xxxxx/dist.[PLATFORM].dgz'
    };
  }
}

