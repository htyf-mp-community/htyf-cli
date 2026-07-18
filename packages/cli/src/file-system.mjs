import fs from 'fs';
import path from 'path';
import fse from 'fs-extra';
import { Logger } from './logger.mjs';

/**
 * 文件系统工具类
 */
export class FileSystemUtils {
  static ensureDirectory(dirPath) {
    try {
      fse.ensureDirSync(dirPath);
      Logger.debug(`目录已确保存在: ${dirPath}`);
      return true;
    } catch (error) {
      Logger.error(`创建目录失败: ${dirPath}`, error.message);
      return false;
    }
  }

  static cleanDirectory(dirPath) {
    try {
      if (fs.existsSync(dirPath)) {
        fse.removeSync(dirPath);
        Logger.info(`目录已清理: ${dirPath}`);
      }
      return true;
    } catch (error) {
      Logger.error(`清理目录失败: ${dirPath}`, error.message);
      return false;
    }
  }

  static backupFile(filePath) {
    try {
      if (fs.existsSync(filePath)) {
        const backupPath = `${filePath}.backup.${Date.now()}`;
        fse.copySync(filePath, backupPath);
        Logger.info(`文件已备份: ${backupPath}`);
        return backupPath;
      }
      return null;
    } catch (error) {
      Logger.error(`备份文件失败: ${filePath}`, error.message);
      return null;
    }
  }

  static getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  static formatFileSize(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 检查目录是否为空
   * @param {string} dirPath
   * @returns {boolean}
   */
  static isDirectoryEmpty(dirPath) {
    if (!fs.existsSync(dirPath)) {
      return true;
    }
    try {
      const entries = fs.readdirSync(dirPath);
      return entries.length === 0;
    } catch (error) {
      Logger.warn(`读取目录内容失败: ${dirPath}`, error.message);
      return false;
    }
  }

  static validatePath(path) {
    // if (/[ -	fa5]/gi.test(path)) {
    //   return { isValid: false, error: '路径中包含中文字符' };
    // }
    return { isValid: true };
  }

  /**
   * 计算目录大小
   * @param {string} dirPath - 目录路径
   * @returns {number} 目录大小（字节）
   */
  static calculateDirectorySize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0;
    let size = 0;
    try {
      const items = fse.readdirSync(dirPath, { withFileTypes: true });
      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          size += this.calculateDirectorySize(itemPath);
        } else {
          size += fs.statSync(itemPath).size;
        }
      }
    } catch (error) {
      Logger.warn(`计算目录大小失败: ${dirPath}`, error.message);
    }
    return size;
  }
}

