#!/usr/bin/env node

const { spawnSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const args = process.argv.slice(2)
function option(name) {
  const index = args.indexOf(name)
  return index < 0 ? undefined : args[index + 1]
}

const platform = option('--platform')
const bundleOutput = option('--bundle-output')
const assetsDest = option('--assets-dest')
if (!['ios', 'android'].includes(platform) || !bundleOutput || !assetsDest) {
  console.error('HTYF native bundle requires --platform, --bundle-output and --assets-dest')
  process.exit(2)
}

const projectRoot = path.resolve(__dirname, '..')
const result = spawnSync(process.execPath, [
  require.resolve('@tarojs/cli/bin/taro'),
  'build', '--type', 'htyf',
  '--platform', platform,
  '--bundle-output', path.resolve(bundleOutput),
  '--assets-dest', path.resolve(assetsDest),
], {
  cwd: projectRoot,
  env: { ...process.env, HTYF_BUILD_MODE: 'native', NODE_ENV: 'production' },
  stdio: 'inherit',
})
if (result.error) throw result.error
if (result.status !== 0) process.exit(result.status || 1)
if (!fs.existsSync(bundleOutput) || fs.statSync(bundleOutput).size === 0) {
  console.error(`HTYF native bundle missing or empty: ${bundleOutput}`)
  process.exit(1)
}
