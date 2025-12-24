import { describe, expect, it } from 'vitest'
import { mkdtemp, writeFile, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { FlowStore, resolveOverrides } from './flowStore'
import { CURRENT_FLOW_SCHEMA_VERSION, type Flow } from '@shared/types'

type TempProject = {
  root: string
  flowsDir: string
}

const createTempProject = async (): Promise<TempProject> => {
  const root = await mkdtemp(join(tmpdir(), 'lumberjack-'))
  const flowsDir = join(root, '.lumberjack', 'flows')
  await mkdir(flowsDir, { recursive: true })
  return { root, flowsDir }
}

const baseFlow: Flow = {
  id: 'flow-1',
  name: 'Sample Flow',
  schemaVersion: CURRENT_FLOW_SCHEMA_VERSION,
  nodes: [
    {
      id: 'node-1',
      type: 'requirements',
      position: { x: 0, y: 0 },
      data: { label: 'Requirements' },
    },
  ],
  edges: [],
  meta: {
    createdAt: new Date().toISOString(),
  },
}

describe('FlowStore', () => {
  it('validates a valid flow schema', () => {
    const store = new FlowStore({ projectRoot: process.cwd() })
    const result = store.validateSchema(baseFlow)
    expect(result.ok).toBe(true)
    expect(result.issues).toHaveLength(0)
  })

  it('loads and migrates older schema versions in memory', async () => {
    const project = await createTempProject()
    const legacyFlow: Flow = {
      ...baseFlow,
      schemaVersion: 0,
    }
    await writeFile(
      join(project.flowsDir, `${legacyFlow.id}.json`),
      JSON.stringify(legacyFlow, null, 2),
      'utf-8'
    )

    const store = new FlowStore({ projectRoot: project.root })
    const result = await store.load(legacyFlow.id)
    expect(result.migrated).toBe(true)
    expect(result.flow.schemaVersion).toBe(CURRENT_FLOW_SCHEMA_VERSION)
  })

  it('marks flows with newer schemaVersion as readOnly', async () => {
    const project = await createTempProject()
    const futureFlow: Flow = {
      ...baseFlow,
      id: 'flow-2',
      schemaVersion: CURRENT_FLOW_SCHEMA_VERSION + 10,
    }
    await writeFile(
      join(project.flowsDir, `${futureFlow.id}.json`),
      JSON.stringify(futureFlow, null, 2),
      'utf-8'
    )

    const store = new FlowStore({ projectRoot: project.root })
    const result = await store.load(futureFlow.id)
    expect(result.readOnly).toBe(true)
  })

  it('resolves overrides by priority', () => {
    const defaults = { timeoutSec: 30, concurrencyLimit: 2 }
    const globalOverride = { concurrencyLimit: 3 }
    const flowOverride = { timeoutSec: 40 }
    const agentOverride = { timeoutSec: 50 }

    const resolved = resolveOverrides(
      defaults,
      globalOverride,
      flowOverride,
      agentOverride
    )

    expect(resolved).toEqual({ timeoutSec: 50, concurrencyLimit: 3 })
  })
})
