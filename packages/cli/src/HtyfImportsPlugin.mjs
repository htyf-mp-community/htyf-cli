import path from 'node:path';
import fse from 'fs-extra';
import { fileURLToPath } from 'node:url';

// ==================== 常量定义 ====================
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const nodeModulesPath = path.join(__dirname, '../node_modules');

// 预编译正则表达式以提高性能
const PNPM_PACKAGE_REGEX = /node_modules\/(?:\.pnpm\/[^/]+\/node_modules\/)?((?:@[^/]+\/)?[^/]+)/;
const DEFAULT_EXPORT_REGEX = /var\s+_default\s*=\s*exports(?:\.default|\["default"\])\s*=/g;
const DEPENDENCY_PLACEHOLDER_REGEX = /__HTYF_DEPENDENCY__/g;
const LEADING_WHITESPACE_REGEX = /^[ \t]+/gm;

// 白名单：这些包即使有 native 代码也不需要检查（系统级或已特殊处理）
const WHITELIST = new Set();

WHITELIST.add('@expo/log-box')

// 错误消息分隔线
const ERROR_SEPARATOR = '═══════════════════════════════════════';

// ==================== 缓存和配置 ====================
const versionCache = new Map();
const nativeCodeCache = new Map();

// 延迟加载共享配置，避免启动时错误
let sharedPkg = null;
function getSharedConfig() {
  if (sharedPkg === null) {
    try {
      const configPath = path.join(__dirname, './shared-output.json');
      sharedPkg = fse.pathExistsSync(configPath) ? fse.readJSONSync(configPath) : {};
    } catch (error) {
      console.warn(`[HtyfModulesPlugin] 读取共享配置失败: ${error.message}`);
      sharedPkg = {};
    }
  }
  return sharedPkg;
}

// ==================== 工具函数 ====================

/**
 * 从 module.context 中提取包名与真实包根目录
 * @param {string} moduleContext - 模块上下文路径
 * @returns {{ packageName: string, packageRoot: string }|null}
 */
function extractPackageInfo(moduleContext) {
  if (!moduleContext?.includes('node_modules')) {
    return null;
  }

  const match = moduleContext.match(PNPM_PACKAGE_REGEX);
  if (!match?.[1]) {
    return null;
  }

  return {
    packageName: match[1],
    packageRoot: moduleContext.slice(0, match.index + match[0].length),
  };
}

/**
 * 检查包是否包含 native 代码（带缓存）
 * @param {string} packageRoot - 包在 node_modules 中的真实根目录
 * @returns {boolean} 是否包含 native 代码
 */
function hasNativeCode(packageRoot) {
  if (!packageRoot) {
    return false;
  }

  if (nativeCodeCache.has(packageRoot)) {
    return nativeCodeCache.get(packageRoot);
  }

  const iosPath = path.join(packageRoot, 'ios');
  const androidPath = path.join(packageRoot, 'android');

  const hasNative = fse.pathExistsSync(iosPath) || fse.pathExistsSync(androidPath);
  nativeCodeCache.set(packageRoot, hasNative);

  return hasNative;
}

/**
 * 获取包版本（带缓存）
 * @param {string} packageRoot - 包在 node_modules 中的真实根目录
 * @returns {string|null} 包版本，如果无法获取则返回 null
 */
function getPackageVersion(packageRoot) {
  if (!packageRoot) {
    return null;
  }

  if (versionCache.has(packageRoot)) {
    return versionCache.get(packageRoot);
  }

  const pkgJsonPath = path.join(packageRoot, 'package.json');
  let version = null;

  try {
    if (fse.pathExistsSync(pkgJsonPath)) {
      const pkgJson = fse.readJsonSync(pkgJsonPath);
      version = pkgJson.version || null;
    }
  } catch (error) {
    version = null;
  }

  versionCache.set(packageRoot, version);
  return version;
}

/**
 * 检查包是否在共享配置中
 * @param {string} packageName - 包名
 * @returns {boolean} 是否在共享配置中
 */
function isInSharedConfig(packageName) {
  const config = getSharedConfig();
  return packageName && Object.hasOwn(config, packageName);
}

/**
 * 检查包是否在白名单中
 * @param {string} packageName - 包名
 * @returns {boolean} 是否在白名单中
 */
function isWhitelisted(packageName) {
  return packageName && WHITELIST.has(packageName);
}

/**
 * 格式化错误消息
 * @param {string[]} unsupportedPackages - 不支持的包列表
 * @returns {string} 格式化的错误消息
 */
function formatErrorMessage(unsupportedPackages) {
  if (!unsupportedPackages?.length) {
    return '';
  }

  const lines = [
    '',
    ERROR_SEPARATOR,
    '  红糖云服暂不支持以下第三方 native 组件',
    ERROR_SEPARATOR,
    '',
    ...unsupportedPackages.map((pkg, index) => `  ${index + 1}. ${pkg}`),
    '',
    ERROR_SEPARATOR,
    '',
  ];

  return lines.join('\n');
}

/**
 * 去除模板字符串中的前导空白
 * @param {TemplateStringsArray} strings - 模板字符串数组
 * @param {...any} values - 插值变量
 * @returns {string} 处理后的字符串
 */
function trimTemplateStrings(strings, ...values) {
  const fullString = strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');
  return fullString.replace(LEADING_WHITESPACE_REGEX, '');
}

// ==================== Webpack Loader ====================

/**
 * Webpack自定义loader，用于在目标模块的源码前后插入额外的代码片段。
 * 可通过options.prependCode / options.appendCode分别指定插入内容。
 *
 * @param {string|Buffer} source 原始模块内容
 * @returns {string} 处理后的模块内容
 */
export default function injectAppInfoLoader(source) {
  this.cacheable?.();

  // 将 Buffer 转换为字符串
  const originalSource = Buffer.isBuffer(source) ? source.toString('utf-8') : source;

  // 注入依赖信息属性
  return `
    ${originalSource}
    try {
      Object.defineProperty(_default, '__HTYF_MP_DEPENDENCY__', {
        value: JSON.parse(__HTYF_DEPENDENCY_STRING_DATA__),
        writable: false,
        enumerable: false,
        configurable: false
      });
      _default = exports.default = _default;
    } catch (error) {
      console.error(error);
    }
  `;
}

export class HtyfModulesPlugin {
  constructor(appConfig = {}) {
    this.config = appConfig;
  }

  /**
   * 应用插件到 Webpack 编译器
   * @param {Compiler} compiler - Webpack 编译器实例
   */
  apply(compiler) {
    const config = this.config;

    // 分析第三方依赖，校验并在 emit 阶段替换占位符
    compiler.hooks.emit.tapAsync('AnalyzeThirdPartyModulesPlugin', (compilation, callback) => {
      try {
        const { dependencies, nativeModules } = this.collectDependencyInfo(compilation);

        // 获取 manifest 路径，如果未配置则使用默认路径（webpack output 路径下的 manifest.json）
        const outputPath = compilation.outputOptions.path || compiler.options.output?.path;
        const manifestPath = this.config.manifest || (outputPath ? path.join(outputPath, 'manifest.json') : null);

        // 筛选出不支持的 native 包
        const unsupportedPackages = Array.from(nativeModules).filter(
          pkg => !isWhitelisted(pkg) && !isInSharedConfig(pkg)
        );

        // 如果存在不支持的包，抛出错误
        if (unsupportedPackages.length > 0) {
          this._pendingDependencyReport = null;
          const errorMessage = formatErrorMessage(unsupportedPackages);
          console.error(errorMessage);

          const error = new Error(
            `发现 ${unsupportedPackages.length} 个不支持的第三方 native 组件。\n${errorMessage}`
          );
          error.unsupportedPackages = unsupportedPackages;
          callback(error);
          return;
        }

        // 替换依赖占位符
        this.replaceDependencyPlaceholders(compilation, dependencies);

        // 暂存依赖报告，待所有 emit 任务完成后再持久化
        this._pendingDependencyReport = { dependencies, manifestPath };
        callback();
      } catch (error) {
        this._pendingDependencyReport = null;
        callback(error);
        process.exit(1);
      }
    });

    // 所有 emit 钩子执行完毕且资源写入磁盘后，再持久化依赖报告
    compiler.hooks.afterEmit.tapAsync('AnalyzeThirdPartyModulesPlugin', (_compilation, callback) => {
      try {
        const pending = this._pendingDependencyReport;
        this._pendingDependencyReport = null;
        if (pending) {
          this.persistDependencyReport(pending.dependencies, pending.manifestPath);
        }
        callback();
      } catch (error) {
        callback(error);
        process.exit(1);
      }
    });

    // 代码签名包装（如果启用）
    if (config.codeSigning) {
      compiler.hooks.emit.tapAsync('WrapCodePlugin', (compilation, callback) => {
        try {
          // 遍历所有编译过的资源文件
          for (const filename of Object.keys(compilation.assets)) {
            const asset = compilation.assets[filename];
            if (!asset || typeof asset.source !== 'function') {
              continue;
            }

            const source = asset.source();
            const wrappedSource = trimTemplateStrings`
              ${source}
            `;

            // 更新文件内容
            compilation.assets[filename] = {
              source: () => wrappedSource,
              size: () => wrappedSource.length,
            };
          }
          callback();
        } catch (error) {
          callback(error);
          process.exit(1);
        }
      });
    }
  }

  /**
   * 收集依赖信息
   * @param {Compilation} compilation - Webpack 编译对象
   * @returns {{dependencies: Object, nativeModules: Set<string>}} 依赖信息
   */
  collectDependencyInfo(compilation) {
    const dependencyMap = new Map();
    const nativeModules = new Set();

    for (const module of compilation.modules) {
      if (!module.context) {
        continue;
      }

      const packageInfo = extractPackageInfo(module.context);
      if (!packageInfo) {
        continue;
      }

      const { packageName, packageRoot } = packageInfo;

      // 如果已经处理过该包，跳过
      if (dependencyMap.has(packageName)) {
        const existing = dependencyMap.get(packageName);
        // 如果之前不是 native 模块，基于当前 module 的真实路径再次检查
        if (!existing.nativeModule && hasNativeCode(packageRoot)) {
          existing.nativeModule = true;
          nativeModules.add(packageName);
        }
        continue;
      }

      // 首次处理该包，version / nativeModule 均基于 module.context 解析出的真实路径
      // react-native 必须视为原生依赖，无论是否检测到 ios/android 目录
      const nativeModule =
        packageName === "react-native" ? true : hasNativeCode(packageRoot);
      const dependencyInfo = {
        name: packageName,
        version: getPackageVersion(packageRoot),
        nativeModule,
      };

      dependencyMap.set(packageName, dependencyInfo);

      if (nativeModule) {
        nativeModules.add(packageName);
      }
    }

    // 将 Map 转换为普通对象
    const dependencies = Object.fromEntries(dependencyMap);

    return {
      dependencies,
      nativeModules,
    };
  }

  /**
   * 持久化依赖报告到文件
   * @param {Object} dependencies - 依赖信息对象
   * @param {string|null} manifestPath - manifest 文件路径，如果未提供则使用配置中的 manifest
   */
  persistDependencyReport(dependencies = {}, manifestPath = null) {
    const manifest = manifestPath || this.config.manifest;
    if (!manifest) {
      return;
    }

    try {
      // 确保 react-native 版本在依赖报告中
      if (!dependencies['react-native']) {
        // 如果 shared-output.json 中没有，尝试从 package.json 读取
        try {
          const packageJsonPath = path.join(nodeModulesPath, '../package.json');
          if (fse.pathExistsSync(packageJsonPath)) {
            const packageJson = fse.readJsonSync(packageJsonPath);
            const reactNativeVersion = packageJson.dependencies?.['react-native'] ||
                                     packageJson.devDependencies?.['react-native'];
            if (reactNativeVersion) {
              const cleanVersion = reactNativeVersion.replace(/^[~^]/, '');
              dependencies['react-native'] = {
                name: 'react-native',
                version: cleanVersion,
                nativeModule: true,
              };
            }
          }
        } catch (error) {
          // 静默失败
        }
      }

      const reportDir = path.dirname(manifest);
      fse.ensureDirSync(reportDir);
      fse.writeJsonSync(
        manifest,
        { packages: dependencies },
        { spaces: 2 }
      );
    } catch (error) {
      throw new Error(`[HtyfModulesPlugin] 写入依赖报告失败: ${error.message}`);
    }
  }

  /**
   * 替换依赖占位符
   * @param {Compilation} compilation - Webpack 编译对象
   * @param {Object} dependencies - 依赖信息对象
   */
  replaceDependencyPlaceholders(compilation, dependencies = {}) {
    // 将依赖信息序列化为 JSON 字符串，并进行安全的字符串转义
    const jsonString = JSON.stringify(dependencies);
    // 转义反斜杠和单引号，用于嵌入到单引号字符串中
    const escapedString = jsonString
      .replace(/\\/g, '\\\\')  // 转义反斜杠
      .replace(/'/g, "\\'");   // 转义单引号
    const stringLiteral = `'${escapedString}'`;

    // 遍历所有资源文件，替换占位符
    for (const filename of Object.keys(compilation.assets)) {
      const asset = compilation.assets[filename];
      if (!asset || typeof asset.source !== 'function') {
        continue;
      }

      const source = asset.source().toString();
      if (!source.includes('__HTYF_DEPENDENCY_STRING_DATA__')) {
        continue;
      }

      const replacedSource = source.replace(DEPENDENCY_PLACEHOLDER_REGEX, stringLiteral);
      compilation.assets[filename] = {
        source: () => replacedSource,
        size: () => replacedSource.length,
      };
    }
  }
}
