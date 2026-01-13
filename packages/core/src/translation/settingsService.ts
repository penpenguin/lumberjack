import type { TranslationSettings } from '@shared/translation/types'
import { validateEndpointUrl } from './endpointValidation'

export type SettingsServiceDeps = {
  now?: () => Date
  initial?: Partial<TranslationSettings>
  repository?: {
    getSettings: () => TranslationSettings | null
    saveSettings: (settings: TranslationSettings) => TranslationSettings
  }
}

const defaultEndpointUrl = 'http://localhost:11434/v1/chat'

const defaultSettings = (now: () => Date): TranslationSettings => ({
  systemPrompt: '',
  customPrompt: '',
  targetLanguage: 'en',
  backTranslate: false,
  agentTimeoutMs: 60000,
  endpointUrl: defaultEndpointUrl,
  updatedAt: now().toISOString(),
})

export const createSettingsService = (deps: SettingsServiceDeps = {}) => {
  const now = deps.now ?? (() => new Date())
  const repository = deps.repository
  const storedSettings = repository?.getSettings() ?? null
  let settings: TranslationSettings = {
    ...defaultSettings(now),
    ...(storedSettings ?? {}),
    ...deps.initial,
  }

  const normalizeEndpoint = (value: string) => {
    const validation = validateEndpointUrl(value)
    if (!validation.ok) {
      return defaultEndpointUrl
    }
    return validation.normalized
  }

  settings = {
    ...settings,
    endpointUrl: normalizeEndpoint(settings.endpointUrl),
  }

  const getSettings = () => settings

  const updateSettings = (
    update: Partial<Omit<TranslationSettings, 'updatedAt'>>
  ): TranslationSettings => {
    const next: TranslationSettings = {
      ...settings,
      ...update,
      updatedAt: now().toISOString(),
    }
    const validation = validateEndpointUrl(next.endpointUrl)
    if (!validation.ok) {
      throw new Error(validation.message)
    }
    next.endpointUrl = validation.normalized
    settings = repository ? repository.saveSettings(next) : next
    return settings
  }

  return { getSettings, updateSettings }
}
