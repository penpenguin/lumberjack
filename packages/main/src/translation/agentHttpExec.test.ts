import { afterEach, describe, expect, it, vi } from 'vitest'
import { agentHttpExec, AgentHttpExecError } from './agentHttpExec'

const originalFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = originalFetch
  vi.restoreAllMocks()
})

describe('agentHttpExec', () => {
  it('posts JSON payload and parses response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({ translatedText: 'hola' }),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await agentHttpExec({
      endpointUrl: 'http://localhost:11434/v1/chat',
      payload: { sourceText: 'hello' },
      timeoutMs: 500,
    })

    expect(result.data).toEqual({ translatedText: 'hola' })
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:11434/v1/chat',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ sourceText: 'hello' }),
      })
    )
  })

  it('throws on non-OK responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 502,
      text: vi.fn().mockResolvedValue('Bad Gateway'),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await expect(
      agentHttpExec({
        endpointUrl: 'http://localhost:11434/v1/chat',
        payload: { sourceText: 'hello' },
      })
    ).rejects.toMatchObject({
      name: 'AgentHttpExecError',
      code: 'http',
      status: 502,
    })
  })

  it('throws on invalid JSON responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockRejectedValue(new Error('invalid json')),
    })
    globalThis.fetch = fetchMock as unknown as typeof fetch

    await expect(
      agentHttpExec({
        endpointUrl: 'http://localhost:11434/v1/chat',
        payload: { sourceText: 'hello' },
      })
    ).rejects.toBeInstanceOf(AgentHttpExecError)
  })
})
