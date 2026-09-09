import path from 'node:path'
import ts from 'typescript'

function relativeTarget(files, from, specifier) {
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(from), specifier))
  return [base, ...['.js', '.mjs', '.cjs', '.json', '.ts', '.tsx', '.d.ts'].map(ext => base + ext),
    ...['index.js', 'index.ts', 'index.d.ts'].map(file => `${base}/${file}`)].find(file => files.has(file))
}

function targets(value) {
  if (typeof value === 'string') return [value]
  return value && typeof value === 'object' ? Object.values(value).flatMap(targets) : []
}

export function validatePackage(manifest, files, contents) {
  const errors = []
  for (const entry of [manifest.main, manifest.module, manifest.types, ...targets(manifest.bin), ...targets(manifest.exports)].filter(Boolean)) {
    if (!entry.includes('*') && !files.has(entry.replace(/^\.\//, ''))) errors.push(`${manifest.name}: missing entry ${entry}`)
  }
  for (const entry of manifest.files || []) {
    if (!/[*!?{]/.test(entry) && !files.has(entry) && ![...files].some(file => file.startsWith(entry + '/'))) errors.push(`${manifest.name}: empty/missing files entry ${entry}`)
  }
  for (const [kind, deps] of Object.entries(manifest)) {
    if (!['dependencies', 'peerDependencies', 'optionalDependencies'].includes(kind)) continue
    for (const [name, version] of Object.entries(deps)) {
      if (/^(workspace:|link:|file:)/.test(version)) errors.push(`${manifest.name}: unpublished dependency ${name}=${version}`)
    }
  }
  for (const file of files) {
    if (/(^|\/)(__tests__|coverage|\.swc|node_modules)(\/|$)|\.(spec|test)\.[cm]?[jt]sx?$|(^|\/)setup\.js$|(^|\/)\.env(?:\.|$)/.test(file)) errors.push(`${manifest.name}: development file ${file}`)
    if (file.endsWith('.map')) {
      const map = JSON.parse(contents.get(file).toString())
      for (const [index, source] of (map.sources || []).entries()) {
        if (typeof map.sourcesContent?.[index] === 'string') continue
        const sourcePath = path.posix.join(map.sourceRoot || '', source)
        if (!relativeTarget(files, file, sourcePath)) errors.push(`${manifest.name}/${file}: missing sourcemap source ${sourcePath}`)
      }
    }
    if (!/\.(?:[cm]?js|d\.ts)$/.test(file)) continue
    const ast = ts.createSourceFile(file, contents.get(file).toString(), ts.ScriptTarget.Latest, true)
    const references = []
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) references.push(node.moduleSpecifier.text)
      if (ts.isCallExpression(node) && node.arguments.length && ts.isStringLiteral(node.arguments[0])) {
        const callee = node.expression.getText(ast)
        if (['require', 'require.resolve', 'import'].includes(callee)) references.push(node.arguments[0].text)
      }
      ts.forEachChild(node, visit)
    }
    visit(ast)
    for (const specifier of references) {
      if (specifier.startsWith('.') && !relativeTarget(files, file, specifier)) errors.push(`${manifest.name}/${file}: missing relative import ${specifier}`)
    }
  }
  return errors
}
