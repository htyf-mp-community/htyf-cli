import fs from 'node:fs'
import path from 'node:path'

// TypeScript emits declarations for .ts files but does not copy input .d.ts files.
const source = path.resolve('src')
const output = path.resolve('dist')
function copy(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue
    const file = path.join(directory, entry.name)
    if (entry.isDirectory()) copy(file)
    else if (entry.name.endsWith('.d.ts')) {
      const target = path.join(output, path.relative(source, file))
      fs.mkdirSync(path.dirname(target), { recursive: true })
      fs.copyFileSync(file, target)
    }
  }
}
copy(source)
