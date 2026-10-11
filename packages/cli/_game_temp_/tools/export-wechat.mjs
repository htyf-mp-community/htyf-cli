import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const localGodot = path.join(root, '.htyf/tools/godot-4.6.1/Godot.app/Contents/MacOS/Godot');
const godot = process.env.GODOT_WECHAT_BIN || process.env.GODOT_BIN ||
  (existsSync(localGodot) ? localGodot : 'godot');
let staging;

function run(args, cwd = root) {
  const result = spawnSync(godot, args, { cwd, stdio: 'inherit' });
  if (result.error) throw new Error(`无法运行 Godot，请设置 GODOT_WECHAT_BIN：${result.error.message}`);
  if (result.status !== 0) throw new Error(`Godot 导出失败（退出码 ${result.status}）。`);
}

try {
  const version = spawnSync(godot, ['--version'], { encoding: 'utf8' });
  if (version.error || version.status !== 0 ||
      !version.stdout.trim().startsWith('4.6.1.stable.official.14d19694e')) {
    throw new Error('AnranS v0.2.1 需要官方 Godot 4.6.1 stable。请设置 GODOT_WECHAT_BIN，参见 WECHAT_EXPORT.md。');
  }
  const config = JSON.parse(readFileSync(path.join(root, 'wechat-export.json'), 'utf8'));
  config.appid = process.env.WECHAT_APPID || config.appid;
  const output = path.resolve(root, config.output);
  if (!config.appid || !['portrait', 'landscape'].includes(config.orientation)) {
    throw new Error('wechat-export.json 缺少 AppID 或屏幕方向无效。');
  }
  // Import with the matching editor without touching the native project's 4.7 cache.
  staging = mkdtempSync(path.join(tmpdir(), 'htyf-wechat-anrans-'));
  const source = path.join(staging, 'project');
  cpSync(root, source, {
    recursive: true,
    filter: entry => {
      const relative = path.relative(root, entry).split(path.sep).join('/');
      return !['.git', '.godot', '.htyf', 'dist', 'node_modules', 'addons/godot_ai']
        .some(excluded => relative === excluded || relative.startsWith(`${excluded}/`));
    },
  });
  const projectPath = path.join(source, 'project.godot');
  let project = readFileSync(projectPath, 'utf8')
    .replace(/^config\/features=.*$/m, 'config/features=PackedStringArray("4.6", "GL Compatibility")')
    .replace(/^_mcp_game_helper=.*\n/m, '')
    .replace(/^enabled=PackedStringArray\(.*\)$/m, 'enabled=PackedStringArray()');
  if (!project.includes('[rendering]')) project += '\n[rendering]\n';
  project = project.replace(/^renderer\/rendering_method(?:\.mobile|\.web)?=.*\n?/gm, '');
  project = project.replace('[rendering]', '[rendering]\nrenderer/rendering_method="gl_compatibility"\nrenderer/rendering_method.web="gl_compatibility"');
  writeFileSync(projectPath, project);
  // Godot 4.6 uses per-preset runnable flags; 4.7 moved these into a separate section.
  const presetsPath = path.join(source, 'export_presets.cfg');
  const presets = readFileSync(presetsPath, 'utf8')
    .replace(/\[runnable_presets\][\s\S]*?(?=\[preset\.0\])/, '')
    .replace(/(\[preset\.\d+\]\n)/g, '$1runnable=false\n');
  writeFileSync(presetsPath, presets);
  // DevTools legitimately rewrites these two JSON files. Preserve its settings
  // and refresh only their hashes; changed runtime/game files remain an error.
  const manifestPath = path.join(output, '.godot-mini-game-export.json');
  if (existsSync(manifestPath)) {
    const previous = JSON.parse(readFileSync(manifestPath, 'utf8'));
    if (previous.tool !== 'godot_mini_game' || previous.platform !== 'wechat' || previous.ownership !== 'managed-output') {
      throw new Error('输出目录缺少有效的 AnranS 所有权标记，请使用新的输出目录。');
    }
    const editable = ['project.config.json', 'project.private.config.json'];
    const previousConfigs = {};
    for (const [file, expected] of Object.entries(previous.output_artifacts)) {
      const bytes = readFileSync(path.join(output, file));
      const metadata = { size: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
      if (editable.includes(file)) {
        previousConfigs[file] = JSON.parse(bytes.toString('utf8'));
        previous.output_artifacts[file] = metadata;
      } else if (metadata.size !== expected.size || metadata.sha256 !== expected.sha256) {
        throw new Error(`导出文件已被修改：${file}。请使用新的输出目录。`);
      }
    }
    for (const [file, settings] of Object.entries(previousConfigs)) {
      const templatePath = path.join(source, 'addons/godot_mini_game/templates/wechat', `${file}.template`);
      const template = JSON.parse(readFileSync(templatePath, 'utf8'));
      const merged = { ...template, ...settings, setting: { ...template.setting, ...settings.setting } };
      if (file === 'project.config.json') {
        merged.appid = '{{APPID}}';
        merged.compileType = 'game';
      }
      writeFileSync(templatePath, JSON.stringify(merged, null, 2) + '\n');
    }
    writeFileSync(manifestPath, JSON.stringify(previous, null, 2) + '\n');
  }
  const log = path.join(staging, 'godot.log');
  run(['--headless', '--log-file', log, '--path', source, '--editor', '--import'], source);
  run(['--headless', '--log-file', log, '--path', source, '--script',
    'res://tools/export-wechat.gd', '--', config.appid, config.orientation, config.preset, output], source);
  const manifest = JSON.parse(readFileSync(path.join(output, '.godot-mini-game-export.json'), 'utf8'));
  if (manifest.template.godot_version !== '4.6.1.stable') throw new Error('导出引擎版本不匹配。');
  for (const [file, expected] of Object.entries(manifest.output_artifacts)) {
    const bytes = readFileSync(path.join(output, file));
    if (bytes.length !== expected.size || createHash('sha256').update(bytes).digest('hex') !== expected.sha256) {
      throw new Error(`导出校验失败：${file}`);
    }
  }
  const loader = readFileSync(path.join(output, 'js/loader.js'), 'utf8');
  if (!loader.includes('engine/godot.zip')) throw new Error('启动入口未指向游戏资源包。');
  console.log(`AnranS 微信小游戏已导出：${output}\nGodot：${manifest.template.godot_version}\nAppID：${config.appid}\n在微信开发者工具中导入此目录进行真机测试。`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  if (staging) rmSync(staging, { recursive: true, force: true });
}
