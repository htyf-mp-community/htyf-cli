import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const sharedOutputPath = path.join(rootDir, 'packages/cli/src/shared-output.json');

const DEPENDENCY_SECTIONS = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
];

const SKIP_VERSION_PREFIXES = ['workspace:', 'file:', 'link:', 'npm:', 'catalog:'];

/**
 * @param {string} version
 * @returns {string}
 */
function normalizeVersion(version) {
  return String(version || '').trim().replace(/^[~^>=<]+/, '');
}

/**
 * @param {string} version
 * @returns {boolean}
 */
function shouldSkipVersion(version) {
  return SKIP_VERSION_PREFIXES.some((prefix) => String(version).startsWith(prefix));
}

/**
 * @returns {string[]}
 */
function collectPackageJsonPaths() {
  const packageJsonPaths = new Set([
    path.join(rootDir, 'package.json'),
  ]);

  const packagesDir = path.join(rootDir, 'packages');
  if (fs.existsSync(packagesDir)) {
    for (const entry of fs.readdirSync(packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const packageJsonPath = path.join(packagesDir, entry.name, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        packageJsonPaths.add(packageJsonPath);
      }
    }
  }

  const templateDirs = ['_apps_temp_', '_web_temp_', '_game_temp_'];
  for (const templateDir of templateDirs) {
    const packageJsonPath = path.join(rootDir, 'packages/cli', templateDir, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      packageJsonPaths.add(packageJsonPath);
    }
  }

  return [...packageJsonPaths].sort();
}

/**
 * @param {Record<string, unknown>} packageJson
 * @param {Record<string, string>} sharedVersions
 * @param {string} packageJsonPath
 * @returns {Array<{ packageJsonPath: string, name: string, section: string, from: string, to: string }>}
 */
function collectSyncChanges(packageJson, sharedVersions, packageJsonPath) {
  const changes = [];

  for (const section of DEPENDENCY_SECTIONS) {
    const deps = packageJson[section];
    if (!deps || typeof deps !== 'object') {
      continue;
    }

    for (const [name, version] of Object.entries(deps)) {
      if (!Object.hasOwn(sharedVersions, name)) {
        continue;
      }

      if (shouldSkipVersion(version)) {
        continue;
      }

      const targetVersion = sharedVersions[name];
      if (normalizeVersion(version) !== normalizeVersion(targetVersion)) {
        changes.push({
          packageJsonPath,
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
 * @param {string} packageJsonPath
 * @param {Array<{ section: string, name: string, to: string }>} changes
 */
function applyChanges(packageJsonPath, changes) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  for (const change of changes) {
    packageJson[change.section][change.name] = change.to;
  }

  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

/**
 * @param {string} filePath
 * @returns {string}
 */
function toRelativePath(filePath) {
  return path.relative(rootDir, filePath);
}

function printUsage() {
  console.log(`用法:
  node scripts/index.mjs [--write] [--watch]

  以 packages/cli/src/shared-output.json 为版本基准，
  同步 monorepo 内所有 package.json 中已存在的对应依赖版本。

选项:
  --write    写入变更（默认仅预览）
  --watch    监听 shared-output.json，变更后自动写入同步
  --help     显示帮助
`);
}

/**
 * @param {{ shouldWrite?: boolean }} [options]
 * @returns {boolean} 是否有变更
 */
function syncDeps(options = {}) {
  const { shouldWrite = false } = options;

  if (!fs.existsSync(sharedOutputPath)) {
    console.error(`未找到 shared-output.json: ${sharedOutputPath}`);
    process.exit(1);
  }

  const sharedVersions = JSON.parse(fs.readFileSync(sharedOutputPath, 'utf8'));
  const packageJsonPaths = collectPackageJsonPaths();
  const allChanges = [];

  for (const packageJsonPath of packageJsonPaths) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    allChanges.push(...collectSyncChanges(packageJson, sharedVersions, packageJsonPath));
  }

  if (allChanges.length === 0) {
    console.log('所有相关依赖版本已与 shared-output.json 一致，无需同步');
    return false;
  }

  const groupedChanges = new Map();
  for (const change of allChanges) {
    if (!groupedChanges.has(change.packageJsonPath)) {
      groupedChanges.set(change.packageJsonPath, []);
    }
    groupedChanges.get(change.packageJsonPath).push(change);
  }

  console.log(`发现 ${allChanges.length} 个依赖需要同步：\n`);

  for (const [packageJsonPath, changes] of groupedChanges) {
    console.log(toRelativePath(packageJsonPath));
    for (const change of changes) {
      console.log(`  ${change.name} [${change.section}] ${change.from} -> ${change.to}`);
    }
    console.log('');
  }

  if (!shouldWrite) {
    console.log('预览模式：未写入任何文件。执行 `node scripts/index.mjs --write` 应用变更。');
    return true;
  }

  for (const [packageJsonPath, changes] of groupedChanges) {
    applyChanges(packageJsonPath, changes);
  }

  console.log(`已同步 ${allChanges.length} 个依赖版本到 ${groupedChanges.size} 个 package.json`);
  console.log('请运行 pnpm install 安装更新后的依赖');
  return true;
}

function watchSharedOutput() {
  console.log(`监听 ${toRelativePath(sharedOutputPath)} 变更，自动同步依赖版本...\n`);
  syncDeps({ shouldWrite: true });

  let timer = null;
  fs.watch(sharedOutputPath, () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      console.log(`\n检测到 shared-output.json 变更 (${new Date().toLocaleTimeString()})`);
      syncDeps({ shouldWrite: true });
    }, 200);
  });
}

function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  if (args.includes('--watch')) {
    watchSharedOutput();
    return;
  }

  const shouldWrite = args.includes('--write');
  syncDeps({ shouldWrite });
}

main();
