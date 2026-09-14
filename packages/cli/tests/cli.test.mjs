import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseCliArgs } from '../src/cli-options.mjs';

const entry = fileURLToPath(new URL('../src/index.mjs', import.meta.url));
function fixture(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'htyf-cli-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  return dir;
}
function run(args, cwd) {
  const result = spawnSync(process.execPath, [entry, ...args], { cwd, encoding: 'utf8', timeout: 10000 });
  assert.ifError(result.error);
  return result;
}

test('TTY keeps menu; non-TTY and explicit automation never open a menu', () => {
  assert.equal(parseCliArgs([], true).command, 'interactive');
  assert.throws(() => parseCliArgs([], false), /必须指定命令/);
  assert.throws(() => parseCliArgs(['--non-interactive'], true), /必须指定命令/);
  assert.equal(parseCliArgs(['debug'], true).command, 'debug');
  assert.equal(parseCliArgs(['--debug'], true).command, 'interactive');
});

test('aliases and strict validation', () => {
  assert.equal(parseCliArgs(['--clean', 'cache']).cleanType, 'cache');
  assert.equal(parseCliArgs(['--sync-deps']).command, 'sync-deps');
  assert.equal(parseCliArgs(['mp-build']).command, 'build');
  assert.equal(parseCliArgs(['init', '--name', 'my-app', '--display-name', '测试', '--template', 'taro']).values.template, 'taro-template');
  for (const args of [ ['bogus'], ['build', '--platform', 'linux'], ['build', '--version', 'next'],
    ['init'], ['clean', '../outside'], ['build', '--name', 'oops'], ['--clean', '--sync-deps'], ['build', '--typo'] ]) {
    assert.throws(() => parseCliArgs(args), undefined, args.join(' '));
  }
});

test('help is side-effect free, even with a mutation command', t => {
  const dir = fixture(t);
  fs.mkdirSync(path.join(dir, 'dist'));
  assert.equal(run(['clean', '--help'], dir).status, 0);
  assert.deepEqual(fs.readdirSync(dir), ['dist']);
  const result = run([], dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /必须指定命令/);
});

test('clean respects --project and preserves unrelated files', t => {
  const cwd = fixture(t), project = fixture(t);
  for (const dir of [cwd, project]) {
    fs.mkdirSync(path.join(dir, 'dist'));
    fs.writeFileSync(path.join(dir, 'keep.txt'), 'keep');
  }
  const result = run(['clean', 'build', '--project', project], cwd);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.existsSync(path.join(project, 'dist')), false);
  assert.equal(fs.existsSync(path.join(cwd, 'dist')), true);
  assert.equal(fs.readFileSync(path.join(project, 'keep.txt'), 'utf8'), 'keep');
});

test('sync-deps runs without stdin and fails on missing package.json', t => {
  const dir = fixture(t);
  assert.equal(run(['sync-deps'], dir).status, 1);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { '@callstack/repack': '0.0.0', unrelated: '1.2.3' } }));
  const result = run(['sync-deps'], dir);
  assert.equal(result.status, 0, result.stderr);
  const deps = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'))).dependencies;
  assert.notEqual(deps['@callstack/repack'], '0.0.0');
  assert.equal(deps.unrelated, '1.2.3');
});

test('build fails without prompting for missing config or version', t => {
  const dir = fixture(t);
  assert.equal(run(['build'], dir).status, 1);
  fs.writeFileSync(path.join(dir, 'app.json'), '{"htyf":{"name":"test"}}');
  const result = run(['build'], dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /--version/);
  assert.equal(fs.readFileSync(path.join(dir, 'app.json'), 'utf8'), '{"htyf":{"name":"test"}}');
});

test('init refuses existing target before cloning', t => {
  const dir = fixture(t);
  fs.mkdirSync(path.join(dir, 'my-app'));
  const result = run(['init', '--name', 'my-app', '--display-name', '测试', '--template', 'app'], dir);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /目录已存在/);
});

test('Godot automation options propagate; invalid executable fails without prompting', async t => {
  const dir = fixture(t);
  const { promptGodotOptions, exportGodot } = await import('../src/export_godot.mjs');
  const options = await promptGodotOptions({ nonInteractive: true, projectDir: dir,
    targetBaseDir: dir, name: 'test', preset: 'iOS', platform: 'ios', godotBin: path.join(dir, 'missing') });
  assert.equal(options.nonInteractive, true);
  assert.equal(options.name, 'test');
  await assert.rejects(exportGodot(options), /不可执行/);
  await assert.rejects(promptGodotOptions({ nonInteractive: true }), /缺少/);
});

for (const [kind, relativePath, repository] of [
  ['taro', 'templates/taro', 'htyf-taro'],
  ['app', 'packages/cli/_apps_temp_', 'htyf-cli'],
  ['game', 'packages/cli/_game_temp_', 'htyf-cli'],
]) test(`init creates ${kind} from its repository without prompting`, async t => {
  const dir = fixture(t);
  const { ProjectInitializer } = await import('../src/project-initializer.mjs');
  const initializer = new ProjectInitializer();
  initializer.getUserInputs = () => { throw new Error('unexpected prompt'); };
  initializer.showSuccessInfo = () => {};
  initializer.processor.cloneRepository = async (_repo, tmp, options) => {
    assert.equal(options.nonInteractive, true);
    assert.equal(_repo, `https://github.com/htyf-mp-community/${repository}.git`);
    const template = path.join(tmp, relativePath);
    fs.mkdirSync(template, { recursive: true });
    fs.writeFileSync(path.join(template, 'app.json'), '{"other":"preserved"}');
    fs.writeFileSync(path.join(template, 'package.json'), '{}');
  };
  const cwd = process.cwd();
  try {
    process.chdir(dir);
    await initializer.initialize({ nonInteractive: true, name: 'my-app', displayName: '测试', template: `${kind}-template` });
    const config = JSON.parse(fs.readFileSync(path.join(dir, 'my-app/app.json')));
    assert.equal(config.other, 'preserved');
    assert.equal(config.htyf.name, 'my-app');
    assert.equal(config.htyf.projectname, '测试');
    assert.match(config.htyf.appid, /^htyfapp/);
  } finally {
    process.chdir(cwd);
  }
});

test('build produces a package and preserves version unless explicitly provided', t => {
  const dir = fixture(t);
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ scripts: { 'build:h5': 'node build.cjs' } }));
  fs.writeFileSync(path.join(dir, 'build.cjs'), "const fs = require('fs'); fs.mkdirSync('dist/h5', {recursive:true}); fs.writeFileSync('dist/h5/index.html', '<h1>test</h1>');");
  const config = { other: true, htyf: { name: 'test', appid: 'testapp', version: '1.0.0', type: 'web', host: 'https://example.com' } };
  const configPath = path.join(dir, 'app.json');
  fs.writeFileSync(configPath, JSON.stringify(config));
  let result = run(['build'], dir);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /构建产物:/);
  assert.ok(fs.statSync(path.join(dir, 'dist/dist.dgz')).size > 0);
  assert.equal(JSON.parse(fs.readFileSync(configPath)).htyf.version, '1.0.0');
  result = run(['build', '--version', '1.2.3', '--platform', 'android'], dir);
  assert.equal(result.status, 0, result.stderr);
  const updated = JSON.parse(fs.readFileSync(configPath));
  assert.equal(updated.htyf.version, '1.2.3');
  assert.equal(updated.other, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(dir, 'dist/dist/app.json'))).version, '1.2.3');
});
