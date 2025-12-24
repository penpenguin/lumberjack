import { describe, expect, it } from 'vitest'
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveArtifactPath, toRelativeArtifactPath } from './stateDb'
import { StateDB } from './stateDb'

const root = '/tmp/lumberjack'

describe('StateDB path helpers', () => {
  it('converts absolute paths to relative', () => {
    const absolute = '/tmp/lumberjack/artifacts/output.txt'
    expect(toRelativeArtifactPath(root, absolute)).toBe('artifacts/output.txt')
  })

  it('resolves relative paths to absolute', () => {
    const relative = 'artifacts/output.txt'
    expect(resolveArtifactPath(root, relative)).toBe(
      '/tmp/lumberjack/artifacts/output.txt'
    )
  })
})

describe('StateDB events', () => {
  it('records and lists events', async () => {
    const baseDir = await mkdtemp(join(tmpdir(), 'lumberjack-db-'))
    const dbPath = join(baseDir, 'state.db')
    const db = new StateDB()
    await db.open(dbPath)

    const now = new Date().toISOString()
    await db.recordEvent({
      runId: 'run-1',
      nodeId: 'node-1',
      type: 'audit',
      payload: { ok: true },
      createdAt: now,
    })
    await db.recordEvent({
      runId: 'run-2',
      type: 'audit',
      createdAt: now,
    })

    const all = await db.listEvents()
    expect(all).toHaveLength(2)

    const filtered = await db.listEvents({ runId: 'run-1' })
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.runId).toBe('run-1')

    await db.close()
  })
})
