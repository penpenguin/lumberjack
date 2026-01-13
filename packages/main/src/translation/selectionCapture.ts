export type ClipboardLike = {
  readText: (type?: 'selection' | 'clipboard') => string
  writeText: (text: string) => void
}

export type CaptureSelectionOptions = {
  clipboard: ClipboardLike
  sendCopyShortcut: () => Promise<void>
  settleDelayMs?: number
  platform?: NodeJS.Platform
}

export type CaptureSelectionResult = {
  text: string
  previousText: string
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

export const captureSelection = async (
  options: CaptureSelectionOptions
): Promise<CaptureSelectionResult> => {
  const { clipboard, sendCopyShortcut, settleDelayMs = 0, platform } = options
  const previousText = clipboard.readText()
  if (platform === 'linux') {
    const selectionText = clipboard.readText('selection')
    if (selectionText) {
      return { text: selectionText, previousText }
    }
  }

  let attemptedCopy = false
  try {
    attemptedCopy = true
    await sendCopyShortcut()
    if (settleDelayMs > 0) {
      await wait(settleDelayMs)
    }
    const text = clipboard.readText()
    return { text, previousText }
  } finally {
    if (attemptedCopy) {
      clipboard.writeText(previousText)
    }
  }
}
