/** 非交互本地构建，不触发 CLI 的版本递增或发布流程。 */
const { spawnSync } = require('node:child_process')
const path = require('node:path')
const platform = process.argv[2] || 'ios'
if (!['ios', 'android'].includes(platform)) throw new Error('Expected ios or android')
const cli = require.resolve('@react-native-community/cli/build/bin.js')
const result = spawnSync(process.execPath, [cli, 'bundle', '--platform', platform, '--dev', 'false', '--entry-file', 'index.js', '--bundle-output', `dist/${platform}/index.bundle`, '--assets-dest', `dist/${platform}`, '--reset-cache'], { cwd: path.resolve(__dirname, '..'), stdio: 'inherit', env: { ...process.env, TARO_ENV: 'htyf', NODE_ENV: 'production' } })
if (result.error) throw result.error
process.exit(result.status ?? 1)
