export type AgentHttpExecOptions = {
  endpointUrl: string
  payload: unknown
  timeoutMs?: number
  headers?: Record<string, string>
}

export type AgentHttpExecResult<T = unknown> = {
  data: T
  status: number
  durationMs: number
}

export class AgentHttpExecError extends Error {
  code: 'timeout' | 'network' | 'http' | 'parse'
  status?: number

  constructor(message: string, code: AgentHttpExecError['code'], status?: number) {
    super(message)
    this.name = 'AgentHttpExecError'
    this.code = code
    this.status = status
  }
}

export const DEFAULT_HTTP_TIMEOUT_MS = 15000

export const agentHttpExec = async <T = unknown>(
  options: AgentHttpExecOptions
): Promise<AgentHttpExecResult<T>> => {
  const { endpointUrl, payload, timeoutMs, headers } = options
  const startedAt = Date.now()
  const controller = new AbortController()
  const timeout = timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS

  const timeoutId = setTimeout(() => {
    controller.abort()
  }, timeout)

  try {
    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(headers ?? {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new AgentHttpExecError(
        `Endpoint returned ${response.status}`,
        'http',
        response.status
      )
    }

    try {
      const data = (await response.json()) as T
      return {
        data,
        status: response.status,
        durationMs: Date.now() - startedAt,
      }
    } catch (error) {
      throw new AgentHttpExecError(
        error instanceof Error ? error.message : 'Invalid JSON response',
        'parse'
      )
    }
  } catch (error) {
    if (error instanceof AgentHttpExecError) {
      throw error
    }

    if (controller.signal.aborted) {
      throw new AgentHttpExecError('Endpoint timeout', 'timeout')
    }

    throw new AgentHttpExecError(
      error instanceof Error ? error.message : 'Network error',
      'network'
    )
  } finally {
    clearTimeout(timeoutId)
  }
}
