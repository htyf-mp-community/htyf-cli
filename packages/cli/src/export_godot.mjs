#!/usr/bin/env node

/**
 * Godot 导出模块
 * 负责处理 Godot 游戏项目的导出和打包
 * 
 * @module export_godot
 */

import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { accessSync, constants as fsConstants } from 'node:fs';
import process from 'node:process';
import { homedir } from 'node:os';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { execa } from 'execa';
import inquirer from 'inquirer';

// ========== 常量定义 ==========

/** Godot 编辑器默认路径（macOS） */
const DEFAULT_GODOT_BIN = '/Applications/Godot.app/Contents/MacOS/Godot';

/** Godot 配置缓存目录 */
const GODOT_CACHE_DIR = path.join(homedir() || process.cwd(), '.htyf');

/** Godot 配置缓存文件路径 */
const GODOT_CACHE_FILE = path.join(GODOT_CACHE_DIR, 'godot-config.json');

/** 支持的平台枚举 */
const PLATFORMS = {
  IOS: 'ios',
  ANDROID: 'android'
};

/** 平台预设名称映射 */
const PRESET_NAMES = {
  [PLATFORMS.IOS]: 'iOS',
  [PLATFORMS.ANDROID]: 'Android'
};

/** 模板 export_presets.cfg 文件路径 */
const TEMPLATE_EXPORT_PRESETS_PATH = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  'export_presets.cfg'
);

/**
 * 查找 Godot 项目根目录（包含 project.godot 的目录）
 * 
 * @param {string} projectDir - 项目目录
 * @returns {string|null} 项目根目录，如果未找到则返回 null
 */
function findGodotProjectRoot(projectDir) {
  let currentDir = path.resolve(projectDir);
  
  // 向上查找，直到找到包含 project.godot 的目录
  while (currentDir !== path.dirname(currentDir)) {
    const projectFile = path.join(currentDir, 'project.godot');
    if (fs.existsSync(projectFile)) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }
  
  return null;
}

/**
 * 解析 export_presets.cfg 文件，检查是否包含指定平台的配置
 * 
 * @param {string} content - 文件内容
 * @returns {object} 包含 hasAndroid 和 hasIos 的对象
 */
function parseExportPresets(content) {
  const hasAndroid = /platform\s*=\s*"Android"/i.test(content);
  const hasIos = /platform\s*=\s*"iOS"/i.test(content);
  return { hasAndroid, hasIos };
}

/**
 * 从模板文件中提取指定平台的预设配置
 * 
 * @param {string} templateContent - 模板文件内容
 * @param {string} platform - 平台名称（'Android' 或 'iOS'）
 * @returns {string} 预设配置内容
 */
function extractPresetFromTemplate(templateContent, platform) {
  const lines = templateContent.split('\n');
  const presetIndex = platform === 'Android' ? 0 : 1;
  const presetSection = `[preset.${presetIndex}]`;
  const optionsSection = `[preset.${presetIndex}.options]`;
  
  let startIndex = -1;
  let endIndex = -1;
  let inPreset = false;
  let inOptions = false;
  
  // 找到预设开始位置
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === presetSection) {
      startIndex = i;
      inPreset = true;
    } else if (inPreset && lines[i].trim() === optionsSection) {
      inOptions = true;
    } else if (inOptions && lines[i].trim().startsWith('[') && lines[i].trim() !== optionsSection) {
      // 遇到下一个节，结束
      endIndex = i;
      break;
    }
  }
  
  if (startIndex === -1) {
    return '';
  }
  
  // 如果没有找到结束位置，取到文件末尾
  if (endIndex === -1) {
    endIndex = lines.length;
  }
  
  return lines.slice(startIndex, endIndex).join('\n');
}

/**
 * 获取现有文件中最大的预设索引
 * 
 * @param {string} content - 文件内容
 * @returns {number} 最大的预设索引，如果没有找到则返回 -1
 */
function getMaxPresetIndex(content) {
  const presetRegex = /\[preset\.(\d+)\]/g;
  let maxIndex = -1;
  let match;
  
  while ((match = presetRegex.exec(content)) !== null) {
    const index = parseInt(match[1], 10);
    if (index > maxIndex) {
      maxIndex = index;
    }
  }
  
  return maxIndex;
}

/**
 * 调整预设配置中的索引
 * 
 * @param {string} presetContent - 预设配置内容
 * @param {number} oldIndex - 旧索引
 * @param {number} newIndex - 新索引
 * @returns {string} 调整后的预设配置内容
 */
function adjustPresetIndex(presetContent, oldIndex, newIndex) {
  return presetContent
    .replace(new RegExp(`\\[preset\\.${oldIndex}\\]`, 'g'), `[preset.${newIndex}]`)
    .replace(new RegExp(`\\[preset\\.${oldIndex}\\.options\\]`, 'g'), `[preset.${newIndex}.options]`);
}

/**
 * 合并预设配置到现有文件
 * 
 * @param {string} existingContent - 现有文件内容
 * @param {string} templateContent - 模板文件内容
 * @returns {string} 合并后的内容
 */
function mergePresets(existingContent, templateContent) {
  const { hasAndroid, hasIos } = parseExportPresets(existingContent);
  let mergedContent = existingContent.trim();
  
  // 获取现有文件中最大的预设索引
  const maxIndex = getMaxPresetIndex(mergedContent);
  let nextIndex = maxIndex + 1;
  
  // 如果缺少 Android 配置，添加它
  if (!hasAndroid) {
    const androidPreset = extractPresetFromTemplate(templateContent, 'Android');
    if (androidPreset) {
      // 调整预设索引
      const adjustedPreset = adjustPresetIndex(androidPreset, 0, nextIndex);
      mergedContent += '\n\n' + adjustedPreset;
      nextIndex++;
    }
  }
  
  // 如果缺少 iOS 配置，添加它
  if (!hasIos) {
    const iosPreset = extractPresetFromTemplate(templateContent, 'iOS');
    if (iosPreset) {
      // 调整预设索引
      const adjustedPreset = adjustPresetIndex(iosPreset, 1, nextIndex);
      mergedContent += '\n\n' + adjustedPreset;
    }
  }
  
  return mergedContent;
}

/**
 * 检查并合并 export_presets.cfg 文件
 * 
 * @param {string} projectRoot - Godot 项目根目录
 */
async function checkAndMergeExportPresets(projectRoot) {
  const exportPresetsPath = path.join(projectRoot, 'export_presets.cfg');
  const templateExists = fs.existsSync(TEMPLATE_EXPORT_PRESETS_PATH);
  
  if (!templateExists) {
    console.warn(`警告: 模板文件 ${TEMPLATE_EXPORT_PRESETS_PATH} 不存在，跳过配置合并`);
    return;
  }
  
  const templateContent = await fs.readFile(TEMPLATE_EXPORT_PRESETS_PATH, 'utf-8');
  
  // 如果项目根目录下没有 export_presets.cfg，直接复制模板文件
  if (!fs.existsSync(exportPresetsPath)) {
    await fs.copyFile(TEMPLATE_EXPORT_PRESETS_PATH, exportPresetsPath);
    return;
  }
  
  // 如果文件存在，检查是否需要合并
  const existingContent = await fs.readFile(exportPresetsPath, 'utf-8');
  const { hasAndroid, hasIos } = parseExportPresets(existingContent);
  
  // 如果两个平台配置都存在，不需要合并
  if (hasAndroid && hasIos) {
    return;
  }
  
  // 需要合并配置
  const mergedContent = mergePresets(existingContent, templateContent);
  await fs.writeFile(exportPresetsPath, mergedContent, 'utf-8');
}

/**
 * 提示用户输入或确认 Godot 导出选项
 * 
 * 如果所有必需参数都已提供，则直接返回，不进行交互式询问
 * 否则通过命令行交互获取用户输入
 * 
 * @param {object} [defaults={}] - 默认选项
 * @param {string} [defaults.targetBaseDir] - 导出目标根目录
 * @param {string} [defaults.projectDir] - Godot 项目目录
 * @param {string} [defaults.appid] - 应用ID（用作导出文件名）
 * @param {string} [defaults.preset] - Godot 导出预设名称
 * @param {string} [defaults.platform] - 导出平台（'ios' 或 'android'）
 * @returns {Promise<object>} Godot 导出选项对象
 * 
 * @example
 * const options = await promptGodotOptions({
 *   targetBaseDir: './dist',
 *   projectDir: './game',
 *   appid: 'com.example.game',
 *   preset: 'iOS',
 *   platform: 'ios'
 * });
 */
export async function promptGodotOptions(defaults = {}) {
  // 如果所有必需的值都已提供，直接返回，不进行询问（用于自动化场景）
  let projectDir = defaults.projectDir ? String(defaults.projectDir).trim() : null;
  
  if (
    defaults.targetBaseDir &&
    projectDir &&
    defaults.appid &&
    defaults.preset &&
    defaults.platform
  ) {
    // 在返回前检查并合并 export_presets.cfg
    const projectRoot = findGodotProjectRoot(projectDir);
    if (projectRoot) {
      await checkAndMergeExportPresets(projectRoot);
    }
    
    return {
      targetBaseDir: String(defaults.targetBaseDir).trim(),
      projectDir: projectDir,
      name: String(defaults.appid).trim(),
      preset: String(defaults.preset).trim(),
      platform: defaults.platform
    };
  }

  // 通过交互式命令行获取用户输入
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'targetBaseDir',
      message: '请输入导出目标根目录 (项目 dist 目录):',
      default: defaults.targetBaseDir || path.resolve(process.cwd(), './dist'),
      validate: (input) => !!input.trim() || '目标根目录不能为空'
    },
    {
      type: 'input',
      name: 'projectDir',
      message: '请输入 Godot 项目目录:',
      default: defaults.projectDir || process.cwd(),
      validate: (input) => !!input.trim() || '项目目录不能为空'
    },
    {
      type: 'input',
      name: 'name',
      message: '请输入导出文件名称 (不含扩展名):',
      default: defaults.name || 'GodotExport',
      validate: (input) => !!input.trim() || '导出文件名称不能为空'
    },
    {
      type: 'input',
      name: 'preset',
      message: '请输入 Godot 导出预设名称:',
      default: defaults.preset || '',
      validate: (input) => !!input.trim() || '导出预设名称不能为空'
    },
    {
      type: 'list',
      name: 'platform',
      message: '请选择导出平台:',
      choices: [
        { name: 'iOS', value: PLATFORMS.IOS },
        { name: 'Android', value: PLATFORMS.ANDROID }
      ],
      default: defaults.platform || 'ios'
    }
  ]);

  projectDir = answers.projectDir.trim();
  
  // 检查并合并 export_presets.cfg
  const projectRoot = findGodotProjectRoot(projectDir);
  if (projectRoot) {
    await checkAndMergeExportPresets(projectRoot);
  }

  return {
    targetBaseDir: answers.targetBaseDir.trim(),
    projectDir: projectDir,
    name: answers.name.trim(),
    preset: answers.preset.trim(),
    platform: answers.platform
  };
}

/**
 * 检查文件是否可执行
 * 
 * @param {string} filePath - 文件路径
 * @returns {boolean} 文件是否可执行
 */
function isExecutable(filePath) {
  if (!filePath) return false;
  if (!fs.existsSync(filePath)) return false;

  try {
    accessSync(filePath, fsConstants.X_OK);
    return true;
  } catch {
    return false;
  }
}

/**
 * 读取缓存的 Godot 编辑器路径
 * 
 * @returns {string} 缓存的路径，如果不存在则返回空字符串
 */
function readCachedGodotPath() {
  try {
    if (!fs.existsSync(GODOT_CACHE_FILE)) {
      return '';
    }
    const data = fs.readJsonSync(GODOT_CACHE_FILE);
    return typeof data?.godotPath === 'string' ? data.godotPath : '';
  } catch {
    return '';
  }
}

/**
 * 保存 Godot 编辑器路径到缓存
 * 
 * @param {string} godotPath - Godot 编辑器路径
 */
async function writeCachedGodotPath(godotPath) {
  try {
    await fs.ensureDir(GODOT_CACHE_DIR);
    await fs.writeJson(GODOT_CACHE_FILE, { godotPath }, { spaces: 2 });
  } catch {
    // 缓存失败不应该阻塞执行
  }
}

/**
 * 提示用户输入 Godot 编辑器路径
 * 
 * @param {string} defaultPath - 默认路径
 * @returns {Promise<string>} 用户输入的路径
 */
async function promptForGodotBinaryPath(defaultPath) {
  const { godotPath } = await inquirer.prompt([
    {
      type: 'input',
      name: 'godotPath',
      message: '请输入 Godot Editor 可执行文件路径:',
      default: defaultPath,
      validate: (input) => !!input.trim() || '路径不能为空'
    }
  ]);

  return godotPath.trim();
}

/**
 * 解析并获取 Godot 编辑器可执行文件路径
 * 
 * 优先级：环境变量 > 缓存 > 默认路径
 * 总是会询问用户，但将缓存值或默认值作为默认输入
 * 
 * @returns {Promise<string>} Godot 编辑器可执行文件路径
 * @throws {Error} 当路径不可执行时抛出错误
 */
async function resolveGodotBinary() {
  // 获取可能的默认值（优先级：环境变量 > 缓存 > 默认路径）
  const override = process.env.GODOT_EDITOR ? process.env.GODOT_EDITOR.trim() : '';
  const cached = readCachedGodotPath();
  
  // 确定默认值
  let defaultPath = override || cached || DEFAULT_GODOT_BIN;
  
  // 总是询问用户，但将缓存值或默认值作为默认输入
  const godotPath = await promptForGodotBinaryPath(defaultPath);

  // 验证路径是否可执行
  if (!isExecutable(godotPath)) {
    throw new Error(`Godot 二进制文件不可执行: ${godotPath}`);
  }

  // 保存用户输入作为下次的默认值
  await writeCachedGodotPath(godotPath);
  return godotPath;
}

/**
 * 执行 Godot 命令行命令
 * 
 * @param {string} godotBin - Godot 编辑器可执行文件路径
 * @param {string[]} args - 命令参数
 */
async function runGodotCommand(godotBin, args) {
  await execa(godotBin, args, { stdio: 'inherit' });
}

/**
 * 处理 Android 平台导出
 * 
 * Android 导出流程：
 * 1. 使用 Godot 导出为 ZIP 包
 * 2. 解压 ZIP 包到指定目录
 * 3. 清理临时 ZIP 文件
 * 
 * @param {object} options - 导出选项
 * @param {string} options.godotBin - Godot 编辑器路径
 * @param {string} options.projectDir - Godot 项目目录
 * @param {string} options.preset - 导出预设名称
 * @param {string} options.targetBaseDir - 目标根目录
 * @param {string} options.name - 导出文件名（不含扩展名）
 */
async function handleAndroidExport({ godotBin, projectDir, preset, targetBaseDir, name }) {
  // Android 导出路径：targetBaseDir/android/app/src/main/assets/
  const assetsBaseDir = path.join(targetBaseDir, 'android', 'app', 'src', 'main', 'assets');
  await fs.ensureDir(assetsBaseDir);

  // 使用 Godot 导出为 ZIP 包
  const zipPath = path.join(assetsBaseDir, `${name}.zip`);
  await runGodotCommand(godotBin, ['--headless', '--path', projectDir, '--export-pack', preset, zipPath]);

  // 解压 ZIP 包到目标目录
  const targetDir = path.join(assetsBaseDir, name);
  await fs.remove(targetDir);
  await fs.ensureDir(targetDir);

  const zip = new AdmZip(zipPath);
  zip.extractAllTo(targetDir, true);
  
  // 清理临时 ZIP 文件
  await fs.remove(zipPath);
}

/**
 * 处理 iOS 平台导出
 * 
 * iOS 导出流程：
 * 1. 使用 Godot 直接导出为 PCK 文件
 * 
 * @param {object} options - 导出选项
 * @param {string} options.godotBin - Godot 编辑器路径
 * @param {string} options.projectDir - Godot 项目目录
 * @param {string} options.preset - 导出预设名称
 * @param {string} options.targetBaseDir - 目标根目录
 * @param {string} options.name - 导出文件名（不含扩展名）
 */
async function handleIosExport({ godotBin, projectDir, preset, targetBaseDir, name }) {
  // iOS 导出路径：targetBaseDir/ios/
  const assetsBaseDir = path.join(targetBaseDir, 'ios');
  await fs.ensureDir(assetsBaseDir);
  
  // 使用 Godot 直接导出为 PCK 文件
  const outputPath = path.join(assetsBaseDir, `${name}.pck`);
  await runGodotCommand(godotBin, ['--headless', '--path', projectDir, '--export-pack', preset, outputPath]);
}

/**
 * 导出 Godot 项目
 * 
 * 主要流程：
 * 1. 解析并获取 Godot 编辑器路径
 * 2. 执行资源导入（执行两次以确保资源正确导入）
 * 3. 根据平台执行相应的导出流程
 * 
 * @param {object} options - 导出选项
 * @param {string} options.platform - 导出平台（'ios' 或 'android'）
 * @param {string} options.projectDir - Godot 项目目录
 * @param {string} options.preset - Godot 导出预设名称
 * @param {string} options.targetBaseDir - 目标根目录
 * @param {string} options.name - 导出文件名（不含扩展名）
 * @throws {Error} 当平台不支持时抛出错误
 * 
 * @example
 * await exportGodot({
 *   platform: 'ios',
 *   projectDir: './game',
 *   preset: 'iOS',
 *   targetBaseDir: './dist',
 *   name: 'MyGame'
 * });
 */
export async function exportGodot(options) {
  // 解析并获取 Godot 编辑器路径
  const godotBin = await resolveGodotBinary();
  const { platform, projectDir, preset, targetBaseDir, name } = options;

  // 执行两次 import 以确保资源正确导入
  // 某些情况下，第一次导入可能不完整，执行两次可以确保所有资源都被正确导入
  const importArgs = ['--headless', '--path', projectDir, '--import'];
  await runGodotCommand(godotBin, importArgs);
  await runGodotCommand(godotBin, importArgs);

  // 根据平台执行相应的导出流程
  switch (platform) {
    case PLATFORMS.IOS:
      await handleIosExport({ godotBin, projectDir, preset, targetBaseDir, name });
      break;
    case PLATFORMS.ANDROID:
      await handleAndroidExport({ godotBin, projectDir, preset, targetBaseDir, name });
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}. Supported: ${Object.values(PLATFORMS).join(', ')}`);
  }
}

/**
 * 主函数（当文件作为 CLI 直接执行时）
 * 
 * 如果该文件被直接执行（而非作为模块导入），则运行主函数
 */
async function main() {
  const options = await promptGodotOptions();
  await exportGodot(options);
}

/**
 * 检查当前文件是否作为 CLI 直接执行
 * 
 * @returns {boolean} 是否为 CLI 执行
 */
const isCliExecution = (() => {
  if (!process.argv[1]) {
    return false;
  }
  const cliUrl = pathToFileURL(process.argv[1]).href;
  return cliUrl === import.meta.url;
})();

// 如果作为 CLI 直接执行，运行主函数
if (isCliExecution) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

