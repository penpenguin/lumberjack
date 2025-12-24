import { BrowserWindow } from 'electron'
import { IPC_CHANNELS, type LumberjackEvent } from '@shared/ipc'

export class EventBus {
  emit(event: LumberjackEvent) {
    for (const window of BrowserWindow.getAllWindows()) {
      window.webContents.send(IPC_CHANNELS.events, event)
    }
  }
}
