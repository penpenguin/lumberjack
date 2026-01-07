import type {
  TranslateRequestPayload,
  TranslateResponsePayload,
} from '@shared/translation/ipc'

export type TranslationControllerDeps = {
  captureSelection: () => Promise<{ text: string }>
  buildRequest: (sourceText: string) => TranslateRequestPayload
  translate: (payload: TranslateRequestPayload) => Promise<TranslateResponsePayload>
  onResult?: (record: TranslateResponsePayload) => void
  onError?: (error: unknown) => void
}

export const createTranslationController = (deps: TranslationControllerDeps) => {
  const handleShortcut = async () => {
    const { text } = await deps.captureSelection()
    const trimmed = text.trim()

    if (!trimmed) return

    const request = deps.buildRequest(trimmed)

    try {
      const record = await deps.translate(request)
      deps.onResult?.(record)
      return record
    } catch (error) {
      deps.onError?.(error)
      throw error
    }
  }

  return { handleShortcut }
}
