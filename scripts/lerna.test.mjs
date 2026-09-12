import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = fileURLToPath(new URL('../', import.meta.url))

test('Lerna selects this repository’s packages inside a parent workspace', () => {
  const result = spawnSync(process.execPath, [join(root, 'scripts/lerna.mjs'), 'list', '--json'], {
    cwd: dirname(root.replace(/\/$/, '')),
    env: { ...process.env, NX_WORKSPACE_ROOT_PATH: dirname(root.replace(/\/$/, '')) },
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, result.stderr)
  const packages = JSON.parse(result.stdout)
  const expected = readdirSync(join(root, 'packages')).map((dir) => {
    const location = join(root, 'packages', dir)
    const manifest = JSON.parse(readFileSync(join(location, 'package.json'), 'utf8'))
    return { name: manifest.name, location, private: manifest.private }
  }).filter((pkg) => !pkg.private)
  assert.deepEqual(
    packages.map(({ name, location }) => ({ name, location })).sort((a, b) => a.name.localeCompare(b.name)),
    expected.map(({ name, location }) => ({ name, location })).sort((a, b) => a.name.localeCompare(b.name)),
  )
})
