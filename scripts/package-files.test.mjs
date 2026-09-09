import assert from 'node:assert/strict'
import test from 'node:test'
import { validatePackage } from './package-files.mjs'

function inspect(manifest, entries) {
  const contents = new Map(Object.entries(entries).map(([file, value]) => [file, Buffer.from(value)]))
  return validatePackage({ name: 'fixture', ...manifest }, new Set(contents.keys()), contents)
}

test('checks declaration imports and required runtime assets inside a packed package', () => {
  const manifest = { main: 'dist/index.js', types: 'dist/index.d.ts' }
  const files = {
    'dist/index.js': "const image = require('./icon.png')",
    'dist/index.d.ts': "export { Config } from './types/index'",
    'dist/icon.png': 'image',
    'dist/types/index.d.ts': 'export interface Config {}'
  }
  assert.deepEqual(inspect(manifest, files), [])
  delete files['dist/types/index.d.ts']
  assert.match(inspect(manifest, files).join('\n'), /missing relative import .\/types\/index/)
  delete files['dist/icon.png']
  assert.match(inspect(manifest, files).join('\n'), /missing relative import .\/icon.png/)
})

test('rejects missing entry points, development files and unreplaced local dependencies', () => {
  const errors = inspect({ exports: { '.': { require: './dist/index.cjs' } }, dependencies: { local: 'workspace:*' } }, {
    'dist/utils.spec.js': '',
    '.env.local': ''
  }).join('\n')
  assert.match(errors, /missing entry .\/dist\/index.cjs/)
  assert.match(errors, /unpublished dependency local/)
  assert.match(errors, /development file dist\/utils.spec.js/)
  assert.match(errors, /development file .env.local/)
})

test('requires sourcemap sources to be embedded or included in the archive', () => {
  const files = {
    'dist/index.js.map': JSON.stringify({ version: 3, sources: ['../src/index.ts'], mappings: '' })
  }
  assert.match(inspect({}, files).join('\n'), /missing sourcemap source/)
  assert.deepEqual(inspect({}, { ...files, 'src/index.ts': 'export {}' }), [])
  files['dist/index.js.map'] = JSON.stringify({ version: 3, sources: ['../src/index.ts'], sourcesContent: ['export {}'], mappings: '' })
  assert.deepEqual(inspect({}, files), [])
})
