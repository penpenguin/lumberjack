/* @vitest-environment node */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import config from '../../../electron.vite.config'

const __dirname = dirname(fileURLToPath(import.meta.url))

describe('electron.vite.config', () => {
  it('keeps node-sqlite3-wasm external for the main bundle', () => {
    const main = (config as { main?: { build?: { rollupOptions?: { external?: string[] } } } })
      .main
    const external = main?.build?.rollupOptions?.external ?? []

    expect(external).toContain('node-sqlite3-wasm')
  })

  it('builds the renderer into out/renderer for preview loadFile', () => {
    const renderer = (config as { renderer?: { build?: { outDir?: string } } })
      .renderer
    const outDir = renderer?.build?.outDir ?? ''
    const normalized = outDir.replace(/\\\\/g, '/')

    expect(normalized.endsWith('/out/renderer')).toBe(true)
  })

  it('includes Windows packaging config', () => {
    const configPath = resolve(__dirname, '../../../electron-builder.yml')
    const contents = readFileSync(configPath, 'utf-8')

    expect(contents).toMatch(/win:/)
    expect(contents).toMatch(/target:/)
  })
})
