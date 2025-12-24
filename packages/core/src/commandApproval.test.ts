import { describe, expect, it } from 'vitest'
import { mkdtemp, writeFile, chmod } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { CommandApprovalService, hashFile } from './commandApproval'
import type { ApprovedCommandRecord } from '@shared/types'

const createExecutable = async () => {
  const dir = await mkdtemp(join(tmpdir(), 'lumberjack-cmd-'))
  const path = join(dir, 'echo.sh')
  await writeFile(path, '#!/usr/bin/env sh\necho ok\n', 'utf-8')
  await chmod(path, 0o755)
  return path
}

describe('CommandApprovalService', () => {
  it('requires approval for new commands', async () => {
    const commandPath = await createExecutable()
    const service = new CommandApprovalService({ allowlist: [commandPath] })
    const decisions = await service.evaluate(
      [{ command: commandPath, args: [] }],
      []
    )
    expect(decisions[0]?.status).toBe('needs_approval')
  })

  it('approves commands with matching hash and args', async () => {
    const commandPath = await createExecutable()
    const hash = await hashFile(commandPath)
    const approved: ApprovedCommandRecord = {
      id: 'cmd-1',
      commandPath,
      argsPattern: [],
      hash,
      approvedAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    }
    const service = new CommandApprovalService({ allowlist: [commandPath] })
    const decisions = await service.evaluate(
      [{ command: commandPath, args: [] }],
      [approved]
    )
    expect(decisions[0]?.status).toBe('approved')
  })

  it('denies commands not on allowlist', async () => {
    const commandPath = await createExecutable()
    const service = new CommandApprovalService({ allowlist: [] })
    const decisions = await service.evaluate(
      [{ command: commandPath, args: [] }],
      []
    )
    expect(decisions[0]?.status).toBe('denied')
    expect(decisions[0]?.reason).toBe('command_not_allowlisted')
  })
})
