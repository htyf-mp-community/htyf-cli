import fs from 'fs';
import path from 'path';
import { execa } from 'execa';
import { requireCjs } from './cjs.mjs';

const fse = requireCjs('fs-extra');
import { Logger } from './logger.mjs';

/**
 * 模板处理器类
 */
export class TemplateProcessor {
  constructor(config) {
    this.config = config;
  }

  async cloneRepository(repoUrl, tmpdir) {
    Logger.info('正在克隆模板仓库...');
    Logger.debug(`仓库地址: ${repoUrl}`);
    Logger.debug(`目标目录: ${tmpdir}`);
    
    try {
      await execa('git', ['clone', '--depth', '1', repoUrl, tmpdir], {
        timeout: 60000 // 60秒超时
      });
      Logger.success('模板仓库克隆完成');
    } catch (error) {
      if (error.code === 'ENOTFOUND') {
        throw new Error('网络连接失败，请检查网络连接或尝试使用其他镜像源');
      } else if (error.code === 'ECONNREFUSED') {
        throw new Error('连接被拒绝，请检查防火墙设置或网络配置');
      } else if (error.exitCode === 128) {
        throw new Error('Git仓库访问失败，请检查仓库地址是否正确');
      } else if (error.signal === 'SIGTERM' || error.timedOut) {
        throw new Error('克隆操作超时，请检查网络连接或稍后重试');
      } else {
        throw new Error(`克隆失败: ${error.message}`);
      }
    }
  }

  cleanupUnusedTemplates(tmpdir, templateType) {
    const pathsToRemove = [
      path.join(tmpdir, 'cli'),
      path.join(tmpdir, '.git'),
      path.join(tmpdir, 'docs'),
      path.join(tmpdir, 'README.md')
    ];

    const cliTemplatesDir = path.join(tmpdir, 'packages/cli');
    const selectedTemplate = this.config.templates[templateType];
    if (selectedTemplate) {
      const selectedPath = path.join(cliTemplatesDir, selectedTemplate.tempPath);
      Object.values(this.config.templates).forEach((template) => {
        const templatePath = path.join(cliTemplatesDir, template.tempPath);
        if (templatePath !== selectedPath) {
          pathsToRemove.push(templatePath);
        }
      });
      pathsToRemove.push(path.join(selectedPath, '.git'));
    }

    pathsToRemove.forEach(pathToRemove => {
      try {
        if (fs.existsSync(pathToRemove)) {
          fse.removeSync(pathToRemove);
          Logger.debug(`已移除: ${pathToRemove}`);
        }
      } catch (err) {
        Logger.warn(`移除失败: ${pathToRemove}`, err.message);
      }
    });
  }

  processTemplate(appRootPath, templateType) {
    const template = this.config.templates[templateType];
    if (!template) {
      throw new Error(`不支持的模板类型: ${templateType}`);
    }

    const tempPath = path.join(appRootPath, '__TEMP__');

  }

}

