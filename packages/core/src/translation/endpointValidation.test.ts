import { describe, expect, it } from 'vitest'
import { validateEndpointUrl } from './endpointValidation'

describe('validateEndpointUrl', () => {
  it('rejects empty values', () => {
    expect(validateEndpointUrl('')).toEqual({
      ok: false,
      message: 'Endpoint URL is required',
    })
    expect(validateEndpointUrl('   ')).toEqual({
      ok: false,
      message: 'Endpoint URL is required',
    })
    expect(validateEndpointUrl(undefined)).toEqual({
      ok: false,
      message: 'Endpoint URL is required',
    })
  })

  it('accepts http/https URLs including localhost and paths', () => {
    expect(validateEndpointUrl('http://localhost:11434/v1/chat')).toEqual({
      ok: true,
      normalized: 'http://localhost:11434/v1/chat',
    })
    expect(validateEndpointUrl('https://example.com/api')).toEqual({
      ok: true,
      normalized: 'https://example.com/api',
    })
  })

  it('rejects unsupported or malformed URLs', () => {
    expect(validateEndpointUrl('ftp://example.com')).toEqual({
      ok: false,
      message: 'Endpoint URL must start with http:// or https://',
    })
    expect(validateEndpointUrl('example.com')).toEqual({
      ok: false,
      message: 'Endpoint URL must start with http:// or https://',
    })
  })
})
