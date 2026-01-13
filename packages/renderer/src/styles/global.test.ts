import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readMainSource = () =>
  readFileSync(resolve(__dirname, '..', 'main.tsx'), 'utf8')
const readGlobalCss = () =>
  readFileSync(resolve(__dirname, 'global.css'), 'utf8')

describe('global styles wiring', () => {
  it('imports global and fonts styles in main entry', () => {
    const source = readMainSource()

    expect(source).toMatch(/['"]\.\/styles\/global\.css['"]/)
    expect(source).toMatch(/['"]\.\/styles\/fonts\.css['"]/)
  })

  it('defines a global font stack with bundled fonts', () => {
    const css = readGlobalCss()

    expect(css).toContain('font-family')
    expect(css).toContain('Noto Sans CJK JP')
    expect(css).toContain('Noto Sans Arabic')
  })

  it('ensures form controls inherit the global font', () => {
    const css = readGlobalCss()

    expect(css).toMatch(/input,\s*textarea,\s*select/)
    expect(css).toMatch(/font(-family)?:\s*inherit/)
  })

  it('ensures buttons inherit the global font', () => {
    const css = readGlobalCss()

    expect(css).toMatch(/button\s*\{/)
    expect(css).toMatch(/button[\s\S]*font(-family)?:\s*inherit/)
  })
})
