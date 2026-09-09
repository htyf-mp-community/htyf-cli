import * as path from 'node:path'
import { getStyleCode, isSourceComponent } from '../src/utils'
import componentLoader from '../src/component'

describe('component detection and global styles', () => {
  it('detects a fragment without JSX elements', () => {
    expect(isSourceComponent('src/a.js', 'export default () => <>hello</>', 'src')).toBe(true)
  })
  it('does not treat arbitrary jsx suffixes as extensions', () => {
    expect(isSourceComponent('src/notjsx', 'export default 1', 'src')).toBe(false)
  })
  it('keeps plain scripts and TypeScript out of JSX processing', () => {
    expect(isSourceComponent('src/a.js', 'export default 1', 'src')).toBe(false)
    expect(isSourceComponent('src/a.ts', 'const value = 1', 'src')).toBe(false)
    expect(isSourceComponent('src/a.js', 'export default () => <View />', 'src')).toBe(true)
  })
  it('collects only static stylesheet imports', () => {
    expect(getStyleCode("import styles from './a.css'; import './b.scss'; import View from 'react'; const x = () => <View />", '/app/src')).toEqual([
      { name: 'styles', path: '/app/src/a.css', fileName: 'a.css' },
      { name: '', path: '/app/src/b.scss', fileName: 'b.scss' }
    ])
  })
  it('emits relative imports for styles below a component directory', () => {
    const previous = (global as any).__taroCommonStyle
    try {
      (global as any).__taroCommonStyle = [{ path: '/app/src/styles/common.css', fileName: 'common.css', name: '' }]
      const result = componentLoader({ sourceCode: 'export default 1', projectRoot: '/app', sourceDir: 'src', filename: 'src/component.js' })
      expect(result).toContain("import './styles/common.css'")
      const absolute = componentLoader({ sourceCode: 'export default 1', projectRoot: '/app', sourceDir: 'src', filename: path.resolve('/app/src/component.js') })
      expect(absolute).toBe(result)
    } finally {
      (global as any).__taroCommonStyle = previous
    }
  })
})
