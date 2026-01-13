import { describe, expect, it, vi } from 'vitest'
import { createSettingsRepository } from './settingsRepository'

const makeSettings = () => ({
  systemPrompt: 'system',
  customPrompt: 'custom',
  targetLanguage: 'ja',
  backTranslate: false,
  agentTimeoutMs: 45000,
  endpointUrl: 'http://localhost:11434/v1/chat',
  updatedAt: '2026-01-07T00:00:00.000Z',
})

describe('settingsRepository', () => {
  it('uses an injected sqlite module when provided', () => {
    class FakeDatabase {
      static lastInstance: FakeDatabase | null = null
      path: string
      exec = vi.fn()
      run = vi.fn()
      get = vi.fn()
      close = vi.fn()

      constructor(path: string) {
        this.path = path
        FakeDatabase.lastInstance = this
      }
    }

    createSettingsRepository({
      dbPath: 'test-settings.db',
      sqliteModule: { Database: FakeDatabase },
    } as unknown as Parameters<typeof createSettingsRepository>[0])

    expect(FakeDatabase.lastInstance?.path).toBe('test-settings.db')
    expect(FakeDatabase.lastInstance?.exec).toHaveBeenCalled()
  })

  it('stores and retrieves settings', () => {
    const repo = createSettingsRepository({ dbPath: ':memory:' })

    const settings = makeSettings()
    repo.saveSettings(settings)

    expect(repo.getSettings()).toEqual(settings)

    repo.close()
  })

  it('returns null when no settings exist', () => {
    const repo = createSettingsRepository({ dbPath: ':memory:' })

    expect(repo.getSettings()).toBeNull()

    repo.close()
  })
})
