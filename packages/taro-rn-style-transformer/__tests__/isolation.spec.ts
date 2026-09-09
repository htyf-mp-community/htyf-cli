import { describe, expect, it } from 'vitest'
import postcss from 'postcss'
import { rollupTransform } from '../src'
import { makePostcssPlugins } from '../src/transforms/postcss'

const source = '.test { height: 10px; }'
const filename = '/tmp/htyf-isolation.css'

describe('style configuration isolation', () => {
  it('isolates concurrent Rollup projects and reuses their own settings', async () => {
    const scaled = rollupTransform({ platform: 'android', config: { htyf: { postcss: { options: {}, scalable: true, stylelint: { enable: false } } } } })
    const fixed = rollupTransform({ platform: 'android', config: { htyf: { postcss: { options: {}, scalable: false, stylelint: { enable: false } } } } })
    const [a, b] = await Promise.all([scaled.transform(source, filename), fixed.transform(source, filename)])
    expect(a!.code).toContain('scalePx2dp(5)')
    expect(b!.code).toContain('"height": 5')
    expect(b!.code).not.toContain('"height": scalePx2dp')
    expect((await scaled.transform(source, filename))!.code).toBe(a!.code)
    expect(await scaled.transform('export default 1', '/tmp/a.js')).toBeUndefined()
  })

  it('does not mutate pixel defaults between plugin pipelines', async () => {
    const make = (designWidth?: number, deviceRatio?: Record<string, number>) => postcss(makePostcssPlugins({
      filename, designWidth, deviceRatio, additionalData: '', transformOptions: { platform: 'android' },
      postcssConfig: { stylelint: { enable: false } }
    })).process(source, { from: filename })
    const before = (await make()).css
    const custom = (await make(375, { 375: 2 })).css
    expect(custom).not.toBe(before)
    expect((await make()).css).toBe(before)
    expect(before).not.toContain('rpx')
  })
})
