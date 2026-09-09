import { describe, expect, test } from 'vitest'
import transform, { transformCSS } from '../src/index'

describe('conversion regressions', () => {
  test('strips complete priority markers before unit classification', () => {
    expect(transform('.a { color: red !IMPORTANT; line-height: 20px !important; width: 10vw ! important; }'))
      .toEqual({ a: { color: 'red', lineHeight: 'scalePx2dp(20)', width: "scaleVu2dp(10, 'vw')" }, __viewportUnits: true })
    expect(transform('.a { padding: 2px !important; }', { scalable: false }).a)
      .toEqual({ paddingTop: 2, paddingRight: 2, paddingBottom: 2, paddingLeft: 2 })
  })

  test('matches complete boolean literals without changing ordinary strings', () => {
    expect(transformCSS([['custom', 'trueblue'], ['other', 'notfalse'], ['enabled', ' TRUE '], ['disabled', ' false ']]))
      .toEqual({ custom: 'trueblue', other: 'notfalse', enabled: true, disabled: false })
  })

  test('ignores comments inside export blocks', () => {
    expect(transform(':export { /* comment */ token: red; }')).toEqual({ token: 'red' })
  })

  test('does not treat inherited object methods as shorthand transforms', () => {
    expect(transformCSS([['constructor', 'custom'], ['toString', 'label']]))
      .toEqual({ constructor: 'custom', toString: 'label' })
  })

  test('preserves declaration order, shorthand overrides and independent selector values', () => {
    const result = transform('.a, .b { margin: 1px 2px; margin-left: 3px; transform: translateX(4px); } .a { margin-top: 5px; }') as any
    expect(result.a.marginTop).toBe('scalePx2dp(5)')
    expect(result.b.marginTop).toBe('scalePx2dp(1)')
    expect(result.a.marginLeft).toBe('scalePx2dp(3)')
    result.a.transform[0].translateX = 'changed'
    expect(result.b.transform[0].translateX).toBe('scalePx2dp(4)')
  })

  test('keeps shorthand blacklist and calls with different scaling options isolated', () => {
    expect(transformCSS([['margin', '2px']], ['margin'])).toEqual({ margin: 'scalePx2dp(2)' })
    const css = '.a { width: 2px; }'
    expect(transform(css, { scalable: false })).toEqual({ a: { width: 2 } })
    expect(transform(css)).toEqual({ a: { width: 'scalePx2dp(2)' } })
  })
})
