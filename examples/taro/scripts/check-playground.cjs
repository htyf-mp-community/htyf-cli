/** 校验源页面映射、HTYF 平台文件、静态依赖和新适配器行为。 */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const ts = require('typescript')
const root = path.resolve(__dirname, '..')
const source = path.join(root, 'src/playground')
const pending = JSON.parse(fs.readFileSync(path.join(root, '.htyf-migration/pending-source-state.json')))
const routesText = fs.readFileSync(path.join(source, 'routes.ts'), 'utf8')
const routes = JSON.parse(routesText.slice(routesText.indexOf('=') + 1))
const failures = []
const suffixes = ['', '.htyf.tsx', '.htyf.ts', '.htyf.scss', '.tsx', '.ts', '.js', '.json', '.scss', '/index.htyf.tsx', '/index.htyf.ts', '/index.tsx', '/index.ts', '/index.js']
const resolve = p => suffixes.some(ext => fs.existsSync(p + ext) && fs.statSync(p + ext).isFile())
const files = fs.readdirSync(source, { recursive: true }).filter(f => fs.statSync(path.join(source, f)).isFile())
assert.equal(new Set(routes).size, routes.length, 'duplicate routes')
for (const route of pending.routes) assert(routes.includes('playground/' + route), 'missing source route: ' + route)
for (const route of routes) assert(resolve(path.join(root, 'src', route)), 'missing page: ' + route)
for (const file of files) {
  assert(!file.includes('.rn.'), 'HTYF business file still uses .rn: ' + file)
  if (!/\.[jt]sx?$/.test(file)) continue
  const absolute = path.join(source, file)
  const content = fs.readFileSync(absolute, 'utf8')
  const ast = ts.createSourceFile(absolute, content, ts.ScriptTarget.Latest, true, file.endsWith('x') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  for (const diagnostic of ast.parseDiagnostics) failures.push(`${file}: ${ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n')}`)
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      const name = node.moduleSpecifier?.text
      if (name?.startsWith('.') && !resolve(path.resolve(path.dirname(absolute), name))) failures.push(`${file}: unresolved ${name}`)
      if (name?.startsWith('@/')) failures.push(`${file}: source alias ${name}`)
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
}
assert.deepEqual(failures, [])

function checkTabs() {
  const code = ts.transpileModule(fs.readFileSync(path.join(root, 'src/app.config.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', code)(() => ({ playgroundPages: routes }), mod, mod.exports)
  const config = mod.exports.default
  assert.equal(config.pages[0], 'playground/pages/home/index', 'source project must remain the launch page')
  assert(!config.pages.includes('pages/playground/index'), 'extra landing menu must not return')
  const sourceTabs = [
    ['项目', 'home', 'system'], ['全局', 'global', 'cycle'],
    ['组件', 'components', 'components'], ['接口', 'apis', 'ring'],
    ['探索', 'explore', 'painted-eggshell'], ['关于', 'about', 'user']
  ]
  assert.deepEqual(config.tabBar.list, sourceTabs.map(([text, page, icon]) => ({
    text, pagePath: `playground/pages/${page}/index`,
    iconPath: `./playground/assets/iconpark/${icon}.png`,
    selectedIconPath: `./playground/assets/iconpark/${icon}_selected.png`
  })))
  assert.equal(config.tabBar.color, '#333333')
  assert.equal(config.tabBar.selectedColor, '#6190E8')
  for (const item of config.tabBar.list) {
    assert(routes.includes(item.pagePath))
    for (const key of ['iconPath', 'selectedIconPath']) assert(fs.existsSync(path.join(root, 'src', item[key])))
  }
  for (const file of files.filter(f => /\.[jt]sx?$/.test(f))) {
    const content = fs.readFileSync(path.join(source, file), 'utf8')
    assert(!content.includes('PlaygroundTabs'), 'inline menu must not return: ' + file)
    assert(!/platform\/tabs['"]/.test(content), 'local tab API must not return: ' + file)
  }
}
async function checkStorage() {
  const data = new Map([['host:key', 'keep'], ['playground:storage-demo:demo', 'value']])
  const native = {
    getStorageInfo: o => o.success({ keys: [...data.keys()], currentSize: 1, limitSize: 100 }),
    setStorage: o => { data.set(o.key, o.data); return Promise.resolve({ errMsg: 'setStorage:ok' }) },
    getStorage: o => Promise.resolve({ data: data.get(o.key) }),
    removeStorage: o => { data.delete(o.key); return Promise.resolve({ errMsg: 'removeStorage:ok' }) }
  }
  const code = ts.transpileModule(fs.readFileSync(path.join(source, 'platform/storage.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  const mod = { exports: {} }
  new Function('require', 'module', 'exports', code)(() => ({ default: native }), mod, mod.exports)
  const api = mod.exports.storageApi
  await api.setStorage({ key: 'another', data: 'test' })
  assert.equal((await api.getStorage({ key: 'another' })).data, 'test')
  assert.deepEqual((await api.getStorageInfo()).keys, ['demo', 'another'])
  await api.clearStorage()
  assert.equal(data.get('host:key'), 'keep')
  assert.equal(data.size, 1)
}
Promise.all([checkTabs(), checkStorage()]).then(() => console.log(`PASS: ${routes.length} source routes, ${files.length} files, local imports, HTYF platform names, source bottom menus and storage isolation`)).catch(error => { console.error(error); process.exitCode = 1 })
