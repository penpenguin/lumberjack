import { ipcMain } from 'electron'
import { FlowStore } from '@core/flowStore'
import { LumberjackError, toStructuredError } from '@shared/errors'
import {
  IPC_CHANNELS,
  type AppStatus,
  type IpcResult,
  type LumberjackEvent,
  type LumberjackIpcApi,
} from '@shared/ipc'
import { EventBus } from './ipcEventBus'

const ok = <T>(data: T): IpcResult<T> => ({ ok: true, data })
const fail = <T>(error: unknown): IpcResult<T> => ({
  ok: false,
  error: toStructuredError(error),
})
const notImplemented = <T>(message: string): IpcResult<T> =>
  fail(new LumberjackError('NOT_IMPLEMENTED', message))

export const registerIpc = ({
  flowStore,
  eventBus,
}: {
  flowStore: FlowStore
  eventBus: EventBus
}) => {
  ipcMain.handle(IPC_CHANNELS.flowsList, async () => {
    try {
      return ok(await flowStore.loadAll())
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.flowsGet, async (_event, flowId: string) => {
    try {
      return ok(await flowStore.load(flowId))
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.flowsSave,
    async (
      _event,
      flowJson: Parameters<LumberjackIpcApi['flows']['save']>[0]
    ) => {
      try {
        await flowStore.save(flowJson)
        return ok(undefined)
      } catch (error) {
        return fail(error)
      }
    }
  )

  ipcMain.handle(IPC_CHANNELS.flowsDelete, async (_event, flowId: string) => {
    try {
      await flowStore.delete(flowId)
      return ok(undefined)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(IPC_CHANNELS.runsCreate, async () =>
    notImplemented('Run API not implemented')
  )

  ipcMain.handle(IPC_CHANNELS.runsGet, async () =>
    notImplemented('Run API not implemented')
  )

  ipcMain.handle(IPC_CHANNELS.runsList, async () =>
    notImplemented('Run API not implemented')
  )

  ipcMain.handle(IPC_CHANNELS.worktreesGet, async () =>
    notImplemented('Worktree API not implemented')
  )

  ipcMain.handle(IPC_CHANNELS.worktreesList, async () =>
    notImplemented('Worktree API not implemented')
  )

  ipcMain.handle(IPC_CHANNELS.statusGet, async () => {
    try {
      const status: AppStatus = {
        appVersion: process.env.npm_package_version ?? '0.0.0',
        platform: process.platform,
        pid: process.pid,
        startedAt: new Date().toISOString(),
      }
      return ok(status)
    } catch (error) {
      return fail(error)
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.eventsEmit,
    async (_event, payload: LumberjackEvent) => {
      try {
        eventBus.emit(payload)
        return ok(undefined)
      } catch (error) {
        return fail(error)
      }
    }
  )
}
