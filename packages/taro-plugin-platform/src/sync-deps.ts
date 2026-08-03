import path from 'path';
import fse from 'fs-extra';
import chalk from 'chalk';
import { confirm } from '@inquirer/prompts';

const sharedOutputPath = path.join(__dirname, '../shared-output.json');
const pluginPackageJsonPath = path.join(__dirname, '../package.json');
const HTYF_TARO_PACKAGE_PREFIX = '@htyf-mp/taro';

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
  const changes: { name: string, section: string, from: string, to: string }[] = [];

  for (const section of DEPENDENCY_SECTIONS) {
    const deps = packageJson[section];
    if (!deps) {
      continue;
    }

    for (const [name, version] of Object.entries(deps)) {
      if (!Object.prototype.hasOwnProperty.call(sharedVersions, name)) {
        continue;
      }

      const targetVersion = sharedVersions[name];
      if (normalizeVersion(version) !== targetVersion) {
        changes.push({
          name: name as string,
          section: section as string,
          from: version as string,
          to: targetVersion as string,
        });
      }
    }
  }

  return changes;
}

/**
 * 读取 @htyf-mp/taro-plugin-platform 当前版本
 * @returns {string | null}
 */
function getPluginVersion() {
  if (!fse.pathExistsSync(pluginPackageJsonPath)) {
    return null;
  }

  const pluginPackageJson = fse.readJsonSync(pluginPackageJsonPath);
  return pluginPackageJson.version || null;
}

/**
 * 收集 package.json 中 @htyf-mp/taro 开头依赖的待同步项
 * @param {Record<string, string>} packageJson
 * @param {string} targetVersion
 * @returns {Array<{ name: string, section: string, from: string, to: string }>}
 */
function collectTaroPackageChanges(packageJson, targetVersion) {
  const changes: { name: string, section: string, from: string, to: string }[] = [];

  for (const section of DEPENDENCY_SECTIONS) {
    const deps = packageJson[section];
    if (!deps) {
      continue;
    }

    for (const [name, version] of Object.entries(deps)) {
      if (!name.startsWith(HTYF_TARO_PACKAGE_PREFIX)) {
        continue;
      }

      if (normalizeVersion(version) !== targetVersion) {
        changes.push({
          name: name as string,
          section: section as string,
          from: version as string,
          to: targetVersion,
        });
      }
    }
  }

  return changes;
}

/**
 * 合并多个变更列表，同一 section + name 仅保留最后一次
 * @param {Array<Array<{ name: string, section: string, from: string, to: string }>>} changeLists
 */
function mergeSyncChanges(...changeLists) {
  const changeMap = new Map();

  for (const changes of changeLists) {
    for (const change of changes) {
      changeMap.set(`${change.section}:${change.name}`, change);
    }
  }

  return Array.from(changeMap.values());
}

/**
 * 将 shared-output.json 与 @htyf-mp/taro 依赖版本同步到项目根目录 package.json
 * @param {{ skipConfirm?: boolean }} [options]
 */
export async function syncDepsShell(workspaceRoot: string, options: { skipConfirm?: boolean } = {}) {
  const { skipConfirm = false } = options;
  const packageJsonPath = path.join(workspaceRoot, 'package.json');

  if (!fse.pathExistsSync(packageJsonPath)) {
    console.error(`未找到 package.json: ${packageJsonPath}`);
    return;
  }

  if (!fse.pathExistsSync(sharedOutputPath)) {
    console.error(`未找到 shared-output.json: ${sharedOutputPath}`);
    return;
  }

  const sharedVersions = fse.readJsonSync(sharedOutputPath);
  const packageJson = fse.readJsonSync(packageJsonPath);
  const pluginVersion = getPluginVersion();

  if (!pluginVersion) {
    console.error(`未找到 ${pluginPackageJsonPath} 或缺少 version 字段，无法同步 @htyf-mp/taro 依赖`);
  }

  const sharedChanges = collectSyncChanges(packageJson, sharedVersions);
  const taroChanges = pluginVersion ? collectTaroPackageChanges(packageJson, pluginVersion) : [];
  const changes = mergeSyncChanges(sharedChanges, taroChanges);

  if (changes.length === 0) {
    console.log('所有相关依赖版本已是最新，无需同步');
    return;
  }

  console.info(`发现 ${changes.length} 个依赖需要同步：`);
  // @ts-ignore
  const _chalk = typeof chalk.cyan === 'function' ? chalk : chalk.default;
  for (const change of changes) {
    console.log(
      `  ${_chalk.cyan(change.name)} ` +
      `[${_chalk.gray(change.section)}] ` +
      `${_chalk.yellow(change.from)} -> ${_chalk.green(change.to)}`
    );
  }

  const confirmed = skipConfirm || await confirm({
    message: '确认将以上依赖版本同步为最新版本？',
    default: true,
  });

  if (!confirmed) {
    console.info('已取消同步操作');
    return;
  }

  for (const change of changes) {
    packageJson[change.section][change.name] = change.to;
  }

  fse.writeJsonSync(packageJsonPath, packageJson, { spaces: 2 });
  console.log(`已同步 ${changes.length} 个依赖版本到 ${packageJsonPath}`);
  console.info('请运行 npm install 或 pnpm install 安装更新后的依赖');
}
