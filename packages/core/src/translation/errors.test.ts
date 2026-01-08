import { describe, expect, it } from 'vitest'
import { mapTranslationError } from './errors'

describe('mapTranslationError', () => {
  it('maps system copy command not found errors', () => {
    const error = new Error('System copy command not found: xdotool')
    error.name = 'SystemCopyCommandNotFoundError'

    expect(mapTranslationError(error)).toEqual({
      title: 'System copy tool not found',
      cause: 'System copy command not found: xdotool',
    })
  })
})
