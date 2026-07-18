import path from 'path';
import { Logger } from './logger.mjs';
import { CONSTANTS } from './constants.mjs';
import { FileSystemUtils } from './file-system.mjs';
import { getProjectRoot } from './utils.mjs';

const projectPath = getProjectRoot();

/**
 * 清理临时文件
 * @param {string} cleanType - 清理类型 ('all', 'build', 'temp', 'logs', 'cache', 或应用名称)
 */
export async function cleanShell(cleanType = 'all') {
  Logger.info('开始清理文件...');

  const pathsToClean = [];
  let totalSizeBefore = 0;

  if (cleanType === 'build') {
    // 只清理构建输出
    const buildPath = CONSTANTS.MP_OUTPUT_DIR;
    pathsToClean.push(buildPath);
    totalSizeBefore += FileSystemUtils.calculateDirectorySize(buildPath);
    Logger.info('清理构建输出文件...');
  } else if (cleanType === 'temp') {
    // 只清理临时文件
    const tempPath = CONSTANTS.TEMP_DIR;
    pathsToClean.push(tempPath);
    totalSizeBefore += FileSystemUtils.calculateDirectorySize(tempPath);
    Logger.info('清理临时文件...');
  } else if (cleanType === 'logs') {
    // 清理日志文件
    const logsPath = CONSTANTS.LOGS_DIR;
    pathsToClean.push(logsPath);
    totalSizeBefore += FileSystemUtils.calculateDirectorySize(logsPath);
    Logger.info('清理日志文件...');
  } else if (cleanType === 'cache') {
    // 清理缓存文件
    const cachePaths = [
      path.join(projectPath, 'node_modules/.cache'),
      path.join(projectPath, '.cache'),
      path.join(projectPath, 'dist/.cache')
    ];
    pathsToClean.push(...cachePaths);
    cachePaths.forEach(cachePath => {
      totalSizeBefore += FileSystemUtils.calculateDirectorySize(cachePath);
    });
    Logger.info('清理缓存文件...');
  } else if (cleanType && cleanType !== 'all') {
    // 清理指定应用的文件
    const appTempPath = path.join(CONSTANTS.TEMP_DIR, cleanType);
    const appBuildPath = path.join(CONSTANTS.MP_OUTPUT_DIR, cleanType);
    pathsToClean.push(appTempPath, appBuildPath);
    totalSizeBefore += FileSystemUtils.calculateDirectorySize(appTempPath) + FileSystemUtils.calculateDirectorySize(appBuildPath);
    Logger.info(`清理应用 ${cleanType} 的文件...`);
  } else {
    // 清理所有文件
    const allPaths = [
      path.join(CONSTANTS.TEMP_DIR),
      path.join(CONSTANTS.MP_OUTPUT_DIR),
      path.join(CONSTANTS.LOGS_DIR),
      path.join(projectPath, 'node_modules/.cache'),
      path.join(projectPath, '.cache'),
      path.join(projectPath, 'dist/.cache')
    ];
    pathsToClean.push(...allPaths);
    allPaths.forEach(cleanPath => {
      totalSizeBefore += FileSystemUtils.calculateDirectorySize(cleanPath);
    });
    Logger.info('清理所有临时文件...');
  }

  let cleanedCount = 0;
  for (const cleanPath of pathsToClean) {
    if (FileSystemUtils.cleanDirectory(cleanPath)) {
      cleanedCount++;
    }
  }

  const freedSpace = FileSystemUtils.formatFileSize(totalSizeBefore);
  Logger.success(`清理完成，已清理 ${cleanedCount} 个目录，释放空间: ${freedSpace}`);
}

