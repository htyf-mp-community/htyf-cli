import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const require = createRequire(import.meta.url)
const args = process.argv.slice(2)
if (args[0] === '--') args.shift()

// A parent pnpm workspace must not determine this repository's release graph.
const result = spawnSync(process.execPath, [require.resolve('lerna/dist/cli.js'), ...args], {
  cwd: root,
  env: { ...process.env, NX_WORKSPACE_ROOT_PATH: root },
  stdio: 'inherit',
})

if (result.error) throw result.error
process.exit(result.status ?? 1)
