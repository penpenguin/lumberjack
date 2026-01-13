import { describe, expect, it, vi } from 'vitest'
import { captureSelection } from './selectionCapture'

describe('captureSelection', () => {
  it('captures selection and restores clipboard', async () => {
    const clipboard = {
      text: 'previous',
      readText() {
        return this.text
      },
      writeText(value: string) {
        this.text = value
      },
    }
    const sendCopyShortcut = async () => {
      clipboard.writeText('selected')
    }

    const result = await captureSelection({ clipboard, sendCopyShortcut })

    expect(result.text).toBe('selected')
    expect(clipboard.text).toBe('previous')
  })

  it('uses primary selection on Linux without invoking the shortcut', async () => {
    const clipboard = {
      readText: (type?: 'selection' | 'clipboard') =>
        type === 'selection' ? 'selected' : 'previous',
      writeText: vi.fn(),
    }
    const sendCopyShortcut = vi.fn().mockResolvedValue(undefined)

    const result = await captureSelection({
      clipboard,
      sendCopyShortcut,
      platform: 'linux',
    })

    expect(result.text).toBe('selected')
    expect(sendCopyShortcut).not.toHaveBeenCalled()
    expect(clipboard.writeText).not.toHaveBeenCalled()
  })
})
