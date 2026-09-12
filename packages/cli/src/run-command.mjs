import fs from 'node:fs';
import path from 'node:path';

export async function runCommand({ command, values, cleanType }) {
  if (command === 'init') {
    const { ProjectInitializer } = await import('./project-initializer.mjs');
    return new ProjectInitializer().initialize({
      nonInteractive: true, name: values.name,
      displayName: values['display-name'], template: values.template
    });
  }
  if (command === 'clean') {
    const { cleanShell } = await import('./clean.mjs');
    return cleanShell(cleanType);
  }
  if (command === 'sync-deps') {
    const { syncDepsShell } = await import('./sync-deps.mjs');
    return syncDepsShell({ skipConfirm: true });
  }
  const config = JSON.parse(fs.readFileSync('app.json', 'utf8'));
  if (!config.htyf || typeof config.htyf !== 'object' || Array.isArray(config.htyf)) {
    throw new Error('请先在 app.json 中配置 htyf');
  }
  const appInfo = { ...config.htyf, version: values.version || config.htyf.version };
  if (!/^\d+\.\d+\.\d+$/.test(appInfo.version || '')) throw new Error('缺少有效版本，请指定 --version x.y.z');
  const { CONSTANTS } = await import('./constants.mjs');
  CONSTANTS.BUNDLE_PLATFORM = values.platform || 'ios';
  const isGodot = fs.existsSync('project.godot');
  const godot = {};
  if (values['godot-bin']) godot.godotBin = path.resolve(values['godot-bin']);
  if (values['godot-project']) godot.projectDir = path.resolve(values['godot-project']);
  if (values['godot-preset']) godot.preset = values['godot-preset'];
  const buildOptions = { nonInteractive: true, godot };
  if (values.version) {
    const { updateAppConfig } = await import('./utils-functions.mjs');
    if (!updateAppConfig(appInfo)) throw new Error('更新 app.json 失败');
  }
  if (command === 'build') {
    const { mpBuildShell } = await import('./build.mjs');
    const artifact = await mpBuildShell(appInfo, isGodot, buildOptions);
    console.log(`构建产物: ${artifact}`);
    return;
  }
  const { mpDebugShell } = await import('./debug.mjs');
  return mpDebugShell(appInfo, isGodot, buildOptions);
}
