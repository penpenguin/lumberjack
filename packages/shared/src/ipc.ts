import type { Flow, FlowLoadResult, RunRecord, WorktreeRecord } from './types'
import type { StructuredError } from './errors'

export const IPC_CHANNELS = {
  flowsList: 'lumberjack:flows:list',
  flowsGet: 'lumberjack:flows:get',
  flowsSave: 'lumberjack:flows:save',
  flowsDelete: 'lumberjack:flows:delete',
  runsCreate: 'lumberjack:runs:create',
  runsGet: 'lumberjack:runs:get',
  runsList: 'lumberjack:runs:list',
  worktreesGet: 'lumberjack:worktrees:get',
  worktreesList: 'lumberjack:worktrees:list',
  statusGet: 'lumberjack:status:get',
  events: 'lumberjack:events',
  eventsEmit: 'lumberjack:events:emit',
} as const

export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: StructuredError }

export interface AppStatus {
  appVersion: string
  platform: string
  pid: number
  startedAt: string
}

export type LumberjackEvent = {
  type: string
  payload?: Record<string, unknown>
}

export interface LumberjackIpcApi {
  flows: {
    list: () => Promise<IpcResult<FlowLoadResult[]>>
    get: (flowId: string) => Promise<IpcResult<FlowLoadResult>>
    save: (flow: Flow) => Promise<IpcResult<void>>
    delete: (flowId: string) => Promise<IpcResult<void>>
  }
  runs: {
    create: (
      flowId: string,
      worktreeId: string
    ) => Promise<IpcResult<RunRecord>>
    get: (runId: string) => Promise<IpcResult<RunRecord | null>>
    list: (flowId?: string) => Promise<IpcResult<RunRecord[]>>
  }
  worktrees: {
    get: (worktreeId: string) => Promise<IpcResult<WorktreeRecord | null>>
    list: () => Promise<IpcResult<WorktreeRecord[]>>
  }
  status: {
    get: () => Promise<IpcResult<AppStatus>>
  }
  events: {
    subscribe: (handler: (event: LumberjackEvent) => void) => () => void
  }
}
