export type EndpointValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; message: string }

const invalidMessage = 'Endpoint URL must start with http:// or https://'
const requiredMessage = 'Endpoint URL is required'

export const validateEndpointUrl = (value?: string): EndpointValidationResult => {
  const trimmed = (value ?? '').trim()
  if (!trimmed) {
    return { ok: false, message: requiredMessage }
  }

  try {
    const url = new URL(trimmed)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return { ok: false, message: invalidMessage }
    }
    return { ok: true, normalized: trimmed }
  } catch {
    return { ok: false, message: invalidMessage }
  }
}
