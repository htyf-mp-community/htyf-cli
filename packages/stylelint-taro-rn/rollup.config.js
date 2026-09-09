import { defineConfig } from 'rollup'
import externals from 'rollup-plugin-node-externals'

// Build the module graph once and reuse it for all published formats.
export default defineConfig({
  input: 'src/index.js',
  plugins: [externals()],
  output: [
    { dir: 'dist', format: 'es', preserveModules: true, preserveModulesRoot: 'src', sourcemap: true },
    { file: 'dist/index.cjs', format: 'cjs', exports: 'default', sourcemap: true },
    { file: 'dist/index.esm.js', format: 'es', sourcemap: true }
  ]
})
