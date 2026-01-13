import { describe, expect, it, vi } from 'vitest'
import { createSettingsService } from './settingsService'

describe('settingsService', () => {
  it('applies updates to prompt and language settings', () => {
    const service = createSettingsService({
      now: () => new Date('2026-01-07T00:00:00.000Z'),
    })

    const updated = service.updateSettings({
      systemPrompt: 'system',
      customPrompt: 'custom',
      targetLanguage: 'fr',
      backTranslate: true,
    })

    expect(updated).toEqual({
      systemPrompt: 'system',
      customPrompt: 'custom',
      targetLanguage: 'fr',
      backTranslate: true,
      agentTimeoutMs: 60000,
      endpointUrl: 'http://localhost:11434/v1/chat',
      updatedAt: '2026-01-07T00:00:00.000Z',
    })

    expect(service.getSettings()).toEqual(updated)
  })

  it('persists a valid endpointUrl update', () => {
    const repository = {
      getSettings: vi.fn().mockReturnValue(null),
      saveSettings: vi.fn((value) => value),
    }
    const service = createSettingsService({
      now: () => new Date('2026-01-07T00:00:00.000Z'),
      repository,
    })

    const updated = service.updateSettings({
      endpointUrl: 'http://localhost:11434/v1/chat',
    })

    expect(updated.endpointUrl).toBe('http://localhost:11434/v1/chat')
    expect(repository.saveSettings).toHaveBeenCalledWith(updated)
  })

  it('rejects invalid endpointUrl updates', () => {
    const repository = {
      getSettings: vi.fn().mockReturnValue(null),
      saveSettings: vi.fn(),
    }
    const service = createSettingsService({
      now: () => new Date('2026-01-07T00:00:00.000Z'),
      repository,
    })

    expect(() =>
      service.updateSettings({ endpointUrl: 'ftp://invalid.example.com' })
    ).toThrow(/http/i)

    expect(repository.saveSettings).not.toHaveBeenCalled()
    expect(service.getSettings().endpointUrl).toBe('http://localhost:11434/v1/chat')
  })
})
