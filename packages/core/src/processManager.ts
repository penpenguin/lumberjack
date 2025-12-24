import { spawn } from 'node:child_process'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { LumberjackError } from '@shared/errors'

export interface ProcessAuditEvent {
  command: string
  args: string[]
  cwd?: string
  exitCode: number | null
  signal: NodeJS.Signals | null
  durationMs: number
}

export interface ProcessAuditSink {
  record: (event: ProcessAuditEvent) => Promise<void> | void
}

export interface SpawnOptions {
  command: string
  args: string[]
  cwd?: string
  env?: NodeJS.ProcessEnv
  timeoutMs?: number
  runId?: string
  nodeId?: string
}

export interface ManagedProcess {
  pid: number
  getStdout: () => string
  getStderr: () => string
  write: (input: string | Buffer) => void
  end: () => void
  exit: Promise<{ exitCode: number | null; signal: NodeJS.Signals | null }>
  cancel: () => Promise<void>
}

interface ProcessRecord {
  pid: number
  command: string
  args: string[]
  runId?: string
  nodeId?: string
  startedAt: string
}

export class ProcessManager {
  private readonly registryPath: string
  private readonly auditSink?: ProcessAuditSink

  constructor({
    projectRoot,
    auditSink,
  }: {
    projectRoot: string
    auditSink?: ProcessAuditSink
  }) {
    this.registryPath = join(
      projectRoot,
      '.lumberjack',
      'local',
      'processes.json'
    )
    this.auditSink = auditSink
  }

  async spawnProcess(options: SpawnOptions): Promise<ManagedProcess> {
    if (!options.command) {
      throw new LumberjackError('PROCESS_COMMAND_EMPTY', 'Command is required')
    }
    const startedAt = Date.now()
    const child = spawn(options.command, options.args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    const record: ProcessRecord = {
      pid: child.pid ?? -1,
      command: options.command,
      args: options.args,
      runId: options.runId,
      nodeId: options.nodeId,
      startedAt: new Date(startedAt).toISOString(),
    }

    await this.appendRecord(record)

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', (chunk) => {
      stdout += chunk.toString()
    })

    child.stderr?.on('data', (chunk) => {
      stderr += chunk.toString()
    })

    let timeoutTimer: NodeJS.Timeout | null = null
    if (options.timeoutMs && options.timeoutMs > 0) {
      timeoutTimer = setTimeout(() => {
        child.kill('SIGTERM')
        setTimeout(() => {
          child.kill('SIGKILL')
        }, 5_000)
      }, options.timeoutMs)
    }

    const exit = new Promise<{
      exitCode: number | null
      signal: NodeJS.Signals | null
    }>((resolve) => {
      child.on('exit', async (code, signal) => {
        if (timeoutTimer) clearTimeout(timeoutTimer)
        await this.removeRecord(record.pid)
        const durationMs = Date.now() - startedAt
        await this.auditSink?.record({
          command: options.command,
          args: options.args,
          cwd: options.cwd,
          exitCode: code,
          signal,
          durationMs,
        })
        resolve({ exitCode: code, signal })
      })
    })

    const cancel = async () => {
      child.kill('SIGTERM')
      setTimeout(() => {
        child.kill('SIGKILL')
      }, 5_000)
    }

    return {
      pid: record.pid,
      getStdout: () => stdout,
      getStderr: () => stderr,
      write: (input) => child.stdin?.write(input),
      end: () => child.stdin?.end(),
      exit,
      cancel,
    }
  }

  async listOrphaned(): Promise<ProcessRecord[]> {
    const records = await this.readRecords()
    await this.writeRecords([])
    return records
  }

  private async appendRecord(record: ProcessRecord): Promise<void> {
    const records = await this.readRecords()
    records.push(record)
    await this.writeRecords(records)
  }

  private async removeRecord(pid: number): Promise<void> {
    const records = await this.readRecords()
    const next = records.filter((record) => record.pid !== pid)
    await this.writeRecords(next)
  }

  private async readRecords(): Promise<ProcessRecord[]> {
    try {
      const raw = await readFile(this.registryPath, 'utf-8')
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as ProcessRecord[]) : []
    } catch {
      return []
    }
  }

  private async writeRecords(records: ProcessRecord[]): Promise<void> {
    await mkdir(dirname(this.registryPath), { recursive: true })
    await writeFile(
      this.registryPath,
      JSON.stringify(records, null, 2),
      'utf-8'
    )
  }
}
