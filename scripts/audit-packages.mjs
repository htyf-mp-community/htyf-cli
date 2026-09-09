import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { validatePackage } from './package-files.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outputArg = process.argv.indexOf('--output-dir')
const output = outputArg < 0 ? fs.mkdtempSync(path.join(os.tmpdir(), 'htyf-packages-')) : path.resolve(process.argv[outputArg + 1])
fs.mkdirSync(output, { recursive: true })
const errors = []
const packages = new Map()
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'

function run(command, args, cwd = root) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
  if (result.error) throw result.error
  if (result.status !== 0) throw new Error(`${command} ${args.join(' ')}\n${result.stderr || result.stdout}`)
  return result.stdout
}

for (const dir of fs.readdirSync(path.join(root, 'packages')).sort()) {
  const cwd = path.join(root, 'packages', dir)
  if (!fs.existsSync(path.join(cwd, 'package.json'))) continue
  const source = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'))
  if (source.private) continue
  if (packages.has(source.name)) throw new Error(`Duplicate package name: ${source.name}`)
  const packed = JSON.parse(run(pnpm, ['pack', '--json', '--pack-destination', output], cwd))
  const archive = path.resolve(cwd, packed.filename)
  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'htyf-package-check-'))
  try {
    run('tar', ['-xzf', archive, '-C', staging])
    const unpacked = path.join(staging, 'package')
    const manifest = JSON.parse(fs.readFileSync(path.join(unpacked, 'package.json'), 'utf8'))
    const files = new Set(packed.files.map(file => file.path))
    const contents = new Map([...files].map(file => [file, fs.readFileSync(path.join(unpacked, file))]))
    packages.set(source.name, { dir, manifest, files, contents, archive })
    errors.push(...validatePackage(manifest, files, contents))
    console.log(`${manifest.name}: ${files.size} files, ${(fs.statSync(archive).size / 1024).toFixed(1)} KiB packed`)
  } finally {
    fs.rmSync(staging, { recursive: true, force: true })
  }
}

for (const { manifest } of packages.values()) {
  for (const [name, version] of Object.entries(manifest.dependencies || {})) {
    if (name.startsWith('@htyf-mp/') && !packages.has(name)) errors.push(`${manifest.name}: missing workspace package ${name}`)
    if (packages.has(name) && version !== packages.get(name).manifest.version) errors.push(`${manifest.name}: internal dependency ${name} version ${version} != ${packages.get(name).manifest.version}`)
  }
}

const report = { output, packages: [...packages.values()].map(({ dir, manifest, files, contents, archive }) => ({
  dir, name: manifest.name, version: manifest.version, fileCount: files.size,
  packedBytes: fs.statSync(archive).size, unpackedBytes: [...contents.values()].reduce((sum, bytes) => sum + bytes.length, 0), archive
})), errors }
fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(`Report: ${path.join(output, 'report.json')}`)
if (errors.length) {
  console.error(errors.join('\n'))
  process.exitCode = 1
} else {
  console.log(`PASS: ${packages.size} package archives verified. Nothing published.`)
}
