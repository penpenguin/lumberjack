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

  it('maps HTTP endpoint errors', () => {
    const error = Object.assign(new Error('Endpoint returned 502'), {
      name: 'AgentHttpExecError',
      code: 'http',
      status: 502,
    })

    expect(mapTranslationError(error)).toEqual({
      title: 'LLM endpoint error',
      cause: 'Endpoint returned 502',
    })
  })

  it('maps HTTP network errors', () => {
    const error = Object.assign(new Error('Network unreachable'), {
      name: 'AgentHttpExecError',
      code: 'network',
    })

    expect(mapTranslationError(error)).toEqual({
      title: 'LLM endpoint error',
      cause: 'Network unreachable',
    })
  })
})
