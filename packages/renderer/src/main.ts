const root = document.getElementById('app')

if (!root) {
  throw new Error('Root element not found')
}

root.innerHTML = `
  <h1>Lumberjack</h1>
  <div class="status">Loading...</div>
`

const statusEl = root.querySelector('.status')

const render = (text: string) => {
  if (statusEl) {
    statusEl.textContent = text
  }
}

const loadStatus = async () => {
  if (!window.lumberjack) {
    render('IPC unavailable')
    return
  }
  const result = await window.lumberjack.status.get()
  if (!result.ok) {
    render(`Error: ${result.error.code} ${result.error.message}`)
    return
  }
  render(
    `version=${result.data.appVersion} platform=${result.data.platform} pid=${result.data.pid}`
  )
}

void loadStatus()
