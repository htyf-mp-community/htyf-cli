import shell from 'shelljs';
import ora from 'ora';
import { Logger } from './logger.mjs';
import { CONSTANTS } from './constants.mjs';

/**
 * 命令执行工具类
 */
export class CommandExecutor {
  static async execute(command, options = {}) {
    const {
      silent = false,
      fatal = true,
      timeout = CONSTANTS.DEFAULT_TIMEOUT,
      retryCount = CONSTANTS.MAX_RETRY_COUNT,
      description = '执行命令',
      showCommand = false
    } = options;

    const displayCommand = showCommand ? command : description;
    const spinner = ora(displayCommand).start();

    // 信号处理：当收到退出信号时，停止 spinner
    const cleanup = () => {
      spinner.stop();
    };
    process.once('SIGINT', cleanup);
    process.once('SIGTERM', cleanup);

    try {
      for (let attempt = 1; attempt <= retryCount; attempt++) {
        try {
          Logger.debug(`执行命令 (尝试 ${attempt}/${retryCount}): ${command}`);

          const result = await new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
              reject(new Error(`命令执行超时 (${timeout}ms)`));
            }, timeout);

            shell.exec(command, {
              silent: silent,
              fatal: false,
              async: false
            }, (code, stdout, stderr) => {
              clearTimeout(timeoutId);
              resolve({ code, stdout, stderr });
            });
          });

          if (result.code === 0) {
            process.removeListener('SIGINT', cleanup);
            process.removeListener('SIGTERM', cleanup);
            spinner.succeed(`${description} 成功`);
            Logger.debug(`命令输出: ${result.stdout}`);
            return result;
          } else {
            throw new Error(`命令执行失败，退出码: ${result.code}, 错误: ${result.stderr}`);
          }
        } catch (error) {
          // 如果是用户中断，直接退出
          if (error.message && (error.message.includes('SIGINT') || error.message.includes('SIGTERM'))) {
            process.removeListener('SIGINT', cleanup);
            process.removeListener('SIGTERM', cleanup);
            spinner.stop();
            throw error;
          }

          if (attempt === retryCount) {
            process.removeListener('SIGINT', cleanup);
            process.removeListener('SIGTERM', cleanup);
            spinner.fail(`${description} 失败 (${retryCount} 次尝试后)`);
            Logger.error(`命令执行失败: ${error.message}`);

            if (fatal) {
              process.exit(1);
            }
            throw error;
          } else {
            Logger.warn(`命令执行失败，准备重试 (${attempt}/${retryCount}): ${error.message}`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // 递增延迟
          }
        }
      }
    } catch (error) {
      process.removeListener('SIGINT', cleanup);
      process.removeListener('SIGTERM', cleanup);
      spinner.stop();
      throw error;
    }
  }

  static async executeWithProgress(command, options = {}) {
    const { description = '执行命令', progressCallback } = options;

    return new Promise((resolve, reject) => {
      const child = shell.exec(command, {
        silent: false,
        fatal: false,
        async: true
      });

      let output = '';

      child.stdout?.on('data', (data) => {
        output += data;
        if (progressCallback) {
          progressCallback(data.toString());
        }
      });

      child.stderr?.on('data', (data) => {
        output += data;
        Logger.warn(`命令输出: ${data}`);
      });

      child.on('close', (code) => {
        if (code === 0) {
          Logger.success(`${description} 完成`);
          resolve({ code, output });
        } else {
          Logger.error(`${description} 失败，退出码: ${code}`);
          reject(new Error(`命令执行失败，退出码: ${code}`));
        }
      });

      child.on('error', (error) => {
        Logger.error(`${description} 出错: ${error.message}`);
        reject(error);
      });
    });
  }
}

