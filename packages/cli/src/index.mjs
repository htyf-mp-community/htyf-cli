#!/usr/bin/env node
import { HELP, parseCliArgs } from './cli-options.mjs';

try {
  const options = parseCliArgs(process.argv.slice(2));
  if (options.help) {
    console.log(HELP);
  } else {
    // 模块在加载时计算项目路径，必须先切换目录再导入。
    if (options.values.project) process.chdir(options.values.project);
    if (options.values.debug) {
      const { setLogLevel } = await import('./logger.mjs');
      setLogLevel(0);
    }
    if (options.command === 'interactive') {
      await import('./interactive.mjs');
    } else {
      const { runCommand } = await import('./run-command.mjs');
      await runCommand(options);
    }
  }
} catch (error) {
  console.error(`htyf: ${error.message}`);
  process.exitCode = 1;
}
