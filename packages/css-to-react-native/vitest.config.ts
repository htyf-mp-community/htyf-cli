import { defineConfig } from 'vitest/config'

// https://cn.vitest.dev/guide/
export default defineConfig({
  test: {
    include: ['tests/**/*.spec.ts?(x)', 'src/**/*.spec.js'],
    coverage: {
      provider: 'istanbul',
      include: ['src/**/*.js'],
    }
  }
})
