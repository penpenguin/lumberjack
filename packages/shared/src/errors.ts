export interface StructuredError {
  code: string
  message: string
  details?: Record<string, unknown>
}

export class LumberjackError extends Error {
  readonly code: string
  readonly details?: Record<string, unknown>

  constructor(
    code: string,
    message: string,
    details?: Record<string, unknown>
  ) {
    super(message)
    this.code = code
    this.details = details
  }

  toStructuredError(): StructuredError {
    return {
      code: this.code,
      message: this.message,
      details: this.details,
    }
  }
}

export const toStructuredError = (
  error: unknown,
  fallbackCode = 'UNKNOWN_ERROR'
): StructuredError => {
  if (error instanceof LumberjackError) {
    return error.toStructuredError()
  }
  if (error instanceof Error) {
    return { code: fallbackCode, message: error.message }
  }
  return {
    code: fallbackCode,
    message: 'Unknown error',
    details: { value: error as unknown },
  }
}
