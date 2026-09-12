import { parseArgs } from 'node:util';

export const HELP = `红糖云服 CLI

用法：
  htyf                              交互式菜单（需要终端）
  htyf init --name my-app --display-name 我的应用 --template taro
  htyf build --project ./my-app --version 1.2.3 --platform ios
  htyf debug --project ./my-app
  htyf clean [all|build|temp|logs|cache] --project ./my-app
  htyf sync-deps --project ./my-app

所有子命令均不询问问题，可由 AI、脚本或 CI 直接调用。
  --project <目录>          项目目录；init 时为父目录，默认当前目录
  --non-interactive        显式要求非交互模式，必须指定子命令
  --name <名称>            init 必填，英文目录名称，如 my-app
  --display-name <名称>    init 必填，2–10 个中文、字母或数字
  --template <模板>        init 必填：taro、app、game（也支持 *-template）
  --version <x.y.z>        build/debug 使用的版本；省略则保留现有版本
  --platform <平台>        build/debug：ios（默认）或 android
  --godot-bin <文件>       Godot 可执行文件；也可使用 GODOT_EDITOR
  --godot-project <目录>   Godot 项目目录，默认自动检测
  --godot-preset <名称>    默认 iOS 或 Android
  --debug                 详细日志（真机调试使用 debug 子命令）
  --help, -h              帮助

兼容：--clean [类型]、--sync-deps、mp-build、mp-debug。
成功退出码 0，失败 1；debug 为持续运行服务，Ctrl+C 停止。
`;

export function parseCliArgs(args, isTTY = Boolean(process.stdin.isTTY)) {
  const { values, positionals } = parseArgs({ args, allowPositionals: true, options: {
    help: { type: 'boolean', short: 'h' }, debug: { type: 'boolean' },
    'non-interactive': { type: 'boolean' }, clean: { type: 'boolean' },
    'sync-deps': { type: 'boolean' },
    ...Object.fromEntries(['project', 'name', 'display-name', 'template', 'version', 'platform',
      'godot-bin', 'godot-project', 'godot-preset'].map(key => [key, { type: 'string' }]))
  }});
  if (values.help || positionals[0] === 'help') return { help: true };
  const commands = [...positionals];
  if (values.clean && values['sync-deps']) throw new Error('不能同时指定多个命令');
  if (values.clean) commands.unshift('clean');
  if (values['sync-deps']) commands.unshift('sync-deps');
  let command = commands.shift();
  command = ({ 'mp-build': 'build', 'mp-debug': 'debug' })[command] || command;
  if (!command) {
    if (values['non-interactive'] || !isTTY) throw new Error('非交互环境必须指定命令；运行 htyf --help 查看用法');
    if (Object.keys(values).some(key => !['debug', 'project'].includes(key))) throw new Error('请为参数指定子命令');
    return { command: 'interactive', values };
  }
  const allowed = {
    init: ['name', 'display-name', 'template'],
    build: ['version', 'platform', 'godot-bin', 'godot-project', 'godot-preset'],
    debug: ['version', 'platform', 'godot-bin', 'godot-project', 'godot-preset'],
    clean: ['clean'], 'sync-deps': ['sync-deps']
  };
  if (!Object.hasOwn(allowed, command)) throw new Error(`未知命令: ${command}`);
  for (const key of Object.keys(values)) {
    if (!['project', 'debug', 'non-interactive'].includes(key) && !allowed[command].includes(key)) {
      throw new Error(`${command} 不支持 --${key}`);
    }
    if (typeof values[key] === 'string' && !values[key].trim()) throw new Error(`--${key} 不能为空`);
  }
  const cleanType = command === 'clean' ? commands.shift() || 'all' : undefined;
  if (commands.length) throw new Error(`多余参数: ${commands.join(' ')}`);
  if (cleanType && !['all', 'build', 'temp', 'logs', 'cache'].includes(cleanType)) throw new Error(`无效清理类型: ${cleanType}`);
  if (values.version && !/^\d+\.\d+\.\d+$/.test(values.version)) throw new Error('--version 必须为 x.y.z');
  if (values.platform && !['ios', 'android'].includes(values.platform)) throw new Error('--platform 必须为 ios 或 android');
  if (command === 'init') {
    for (const key of ['name', 'display-name', 'template']) if (!values[key]) throw new Error(`init 缺少 --${key}`);
    values.template = values.template.replace(/-template$/, '') + '-template';
    if (!['taro-template', 'app-template', 'game-template'].includes(values.template)) throw new Error('无效模板类型');
    if (!/^([a-z]+)(-[a-z0-9]+)*$/.test(values.name)) throw new Error('目录名称格式应为 my-app');
    if (!/^[\u4e00-\u9fa5a-zA-Z0-9]{2,10}$/.test(values['display-name'])) throw new Error('应用名称需为 2–10 个中文、字母或数字');
  }
  return { command, values, cleanType };
}
