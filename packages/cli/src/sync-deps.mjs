import path from 'path';
import fse from 'fs-extra';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';
import { confirm } from '@inquirer/prompts';
import { Logger } from './logger.mjs';
import { getProjectRoot } from './utils.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectPath = getProjectRoot();
const sharedOutputPath = path.join(__dirname, './shared-output.json');

const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

/**
 * 规范化版本号，去除前缀符号以便比较
 * @param {string} version
 * @returns {string}
 */
function normalizeVersion(version) {
  return String(version || '').replace(/^[~^>=<]+/, '');
}

/**
 * 收集 package.json 中与 shared-output.json 匹配的待同步项
 * @param {Record<string, string>} packageJson
 * @param {Record<string, string>} sharedVersions
 * @returns {Array<{ name: string, section: string, from: string, to: string }>}
 */
function collectSyncChanges(packageJson, sharedVersions) {
  const changes = [];

  for (const section of DEPENDENCY_SECTIONS) {
    const deps = packageJson[section];
    if (!deps) {
      continue;
    }

    for (const [name, version] of Object.entries(deps)) {
      if (!Object.hasOwn(sharedVersions, name)) {
        continue;
      }

      const targetVersion = sharedVersions[name];
      if (normalizeVersion(version) !== targetVersion) {
        changes.push({
          name,
          section,
          from: version,
          to: targetVersion,
        });
      }
    }
  }

  return changes;
}

/**
 * 将 shared-output.json 中的版本同步到项目根目录 package.json
 * @param {{ skipConfirm?: boolean }} [options]
 */
export async function syncDepsShell(options = {}) {
  const { skipConfirm = false } = options;
  const packageJsonPath = path.join(projectPath, 'package.json');

  if (!fse.pathExistsSync(packageJsonPath)) {
    Logger.error(`未找到 package.json: ${packageJsonPath}`);
    return;
  }

  if (!fse.pathExistsSync(sharedOutputPath)) {
    Logger.error(`未找到 shared-output.json: ${sharedOutputPath}`);
    return;
  }

  const sharedVersions = fse.readJsonSync(sharedOutputPath);
  const packageJson = fse.readJsonSync(packageJsonPath);
  const changes = collectSyncChanges(packageJson, sharedVersions);

  if (changes.length === 0) {
    Logger.success('所有相关依赖版本已与 shared-output.json 一致，无需同步');
    return;
  }

  Logger.info(`发现 ${changes.length} 个依赖需要同步：`);
  for (const change of changes) {
    console.log(
      `  ${chalk.cyan(change.name)} ` +
      `[${chalk.gray(change.section)}] ` +
      `${chalk.yellow(change.from)} -> ${chalk.green(change.to)}`
    );
  }

  const confirmed = skipConfirm || await confirm({
    message: '确认将以上依赖版本同步为 shared-output.json 中的版本？',
    default: true,
  });

  if (!confirmed) {
    Logger.info('已取消同步操作');
    return;
  }

  for (const change of changes) {
    packageJson[change.section][change.name] = change.to;
  }

  fse.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  Logger.success(`已同步 ${changes.length} 个依赖版本到 ${packageJsonPath}`);
  Logger.info('请运行 npm install 或 pnpm install 安装更新后的依赖');
}
