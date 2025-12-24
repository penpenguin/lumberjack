import { describe, expect, it } from 'vitest'
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { ProcessManager } from './processManager'

describe('ProcessManager', () => {
  it('returns and clears orphaned records', async () => {
    const root = await mkdtemp(join(tmpdir(), 'lumberjack-proc-'))
    const registryDir = join(root, '.lumberjack', 'local')
    await mkdir(registryDir, { recursive: true })
    const registryPath = join(registryDir, 'processes.json')
    await writeFile(
      registryPath,
      JSON.stringify([
        {
          pid: 1,
          command: 'echo',
          args: [],
          startedAt: new Date().toISOString(),
        },
      ]),
      'utf-8'
    )

    const manager = new ProcessManager({ projectRoot: root })
    const orphans = await manager.listOrphaned()
    expect(orphans).toHaveLength(1)

    const raw = await readFile(registryPath, 'utf-8')
    expect(JSON.parse(raw)).toEqual([])
  })
})
