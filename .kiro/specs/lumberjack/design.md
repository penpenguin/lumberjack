# Design Document: Lumberjack

## Overview

Lumberjackは、SDLC工程をノードとして可視化・実行するElectronベースのローカル完結型デスクトップアプリケーションである。本設計は、サーバレスアーキテクチャ、外部Agent spawn、起動時復帰、認証情報非保持の4つの設計原則に基づく。

### 設計原則

1. **サーバレス**: 全ての処理はElectron main processで実行し、外部APIサーバを使用しない
2. **CLI依存**: 外部Agent/CLIをspawnで呼び出し、stdin/stdoutで通信する
3. **状態復帰**: 起動時にDB・Flow・worktreeを突合し、前回状態を復帰する
4. **認証情報非保持**: 認証はgit/gh等の既存CLI認証に依存し、アプリは一切保持しない

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Electron App                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Renderer Process                      │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │    │
│  │  │ ReactFlow   │  │ Run Status  │  │ Worktree Panel  │  │    │
│  │  │ Editor      │  │ Dashboard   │  │                 │  │    │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │    │
│  └──────────────────────────┬──────────────────────────────┘    │
│                             │ IPC (contextBridge)               │
│  ┌──────────────────────────┴──────────────────────────────┐    │
│  │                    Main Process (Orchestrator)           │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────────┐    │    │
│  │  │ FlowStore │  │ StateDB   │  │ WorktreeManager   │    │    │
│  │  └───────────┘  └───────────┘  └───────────────────┘    │    │
│  │  ┌───────────┐  ┌───────────┐  ┌───────────────────┐    │    │
│  │  │ RunEngine │  │ Process   │  │ AgentAdapter      │    │    │
│  │  │           │  │ Manager   │  │                   │    │    │
│  │  └───────────┘  └───────────┘  └───────────────────┘    │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ spawn (shell=false)
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Processes                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │ git     │  │ gh/glab │  │ codex   │  │ aider   │            │
│  └─────────┘  └─────────┘  └─────────┘  └─────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

### プロセス間通信

```
Renderer ──IPC──> Main Process ──spawn──> External CLI/Agent
    │                  │
    │                  ├── FlowStore (JSON files)
    │                  ├── StateDB (SQLite Wasm)
    │                  └── WorktreeManager (git CLI)
    │
    └── contextBridge API (preload.js)
```

## Components and Interfaces

### 1. FlowStore

Flow定義のJSON永続化を担当する。

```typescript
interface FlowStore {
  // Flow CRUD
  loadAll(): Promise<FlowLoadResult[]> // Returns readOnly/migrated flags for each flow
  load(flowId: string): Promise<FlowLoadResult> // Returns readOnly flag for incompatible versions
  save(flow: Flow): Promise<void>
  delete(flowId: string): Promise<void>

  // Schema management
  validateSchema(json: unknown): ValidationResult
  migrateSchema(flow: Flow): Flow

  // Override management
  loadOverrides(): Promise<LocalOverrides>
  saveOverrides(overrides: LocalOverrides): Promise<void>
}

// Note: Agent config resolution is handled by Orchestrator at execution time:
// 1. Orchestrator loads AgentConfig from Flow JSON via FlowStore
// 2. Orchestrator loads LocalOverrides via FlowStore.loadOverrides()
// 3. Orchestrator merges to create ResolvedAgentConfig (see AgentAdapter section)
// 4. Orchestrator passes ResolvedAgentConfig to AgentAdapter.execute()

interface FlowLoadResult {
  flow: Flow
  readOnly: boolean // true if schemaVersion is newer than supported
  migrated: boolean // true if schema was migrated in-memory
}

interface Flow {
  id: string
  name: string
  schemaVersion: number
  nodes: FlowNode[]
  edges: FlowEdge[]
  meta: FlowMeta
}

interface FlowNode {
  id: string
  type: SDLCPhaseType | string // 'requirements' | 'design' | 'implementation' | 'test' | 'review' | 'deploy' | custom
  position: { x: number; y: number }
  data: NodeData
}

interface NodeData {
  label: string
  agent?: AgentConfig
  promptTemplate?: string
  inputArtifacts?: ArtifactRef[]
  outputArtifacts?: ArtifactDef[]
  contextOverrides?: ContextOverride[]
  [key: `x-${string}`]: unknown // Extension fields
}

interface AgentConfig {
  type: 'stdio-json'
  command: string
  envAllowlist?: string[]
  // Note: args, adapterCommand, envDenylist, timeoutSec are stored in local overrides
  // to comply with Requirement 2.4 (only agent type, command, envAllowlist in Flow)
}

// Local overrides structure (stored in .lumberjack/local/overrides.json, git-ignored)
interface LocalOverrides {
  // Flow-level overrides
  flows?: {
    [flowId: string]: {
      defaultTimeout?: number // → ExecutionContext.constraints.maxTimeout
      concurrencyLimit?: number // → RunOptions.concurrencyLimit
    }
  }
  // Agent-level overrides (keyed by command name)
  agents?: {
    [agentCommand: string]: {
      args?: string[] // → ResolvedAgentConfig.args
      adapterCommand?: string // → ResolvedAgentConfig.adapterCommand
      envDenylist?: string[] // → ResolvedAgentConfig.envDenylist
      timeoutSec?: number // → ResolvedAgentConfig.timeoutSec
    }
  }
  // Global settings (lowest priority, overridden by flow/agent-level)
  global?: {
    defaultTimeout?: number // Default timeout for all agents
    maxConcurrency?: number // Default concurrency limit
  }
}

// Override resolution priority (highest to lowest):
// 1. Agent-level (LocalOverrides.agents[command])
// 2. Flow-level (LocalOverrides.flows[flowId])
// 3. Global (LocalOverrides.global)
// 4. Built-in defaults
```

### 2. StateDB

SQLite (Wasm) による状態・履歴の永続化を担当する。

```typescript
interface StateDB {
  // Lifecycle
  open(dbPath: string): Promise<void>
  close(): Promise<void>
  acquireLock(): Promise<LockResult>
  releaseLock(): Promise<void>

  // Migrations
  getSchemaVersion(): number
  applyMigrations(): Promise<MigrationResult>

  // Runs
  createRun(flowId: string, worktreeId: string): Promise<Run>
  getRun(runId: string): Promise<Run | null>
  updateRunState(runId: string, state: RunState): Promise<void>
  listRuns(flowId?: string): Promise<Run[]>

  // Node States
  getNodeState(runId: string, nodeId: string): Promise<NodeState | null>
  updateNodeState(
    runId: string,
    nodeId: string,
    state: NodeState
  ): Promise<void>

  // Worktrees
  createWorktree(record: WorktreeRecord): Promise<void>
  getWorktree(worktreeId: string): Promise<WorktreeRecord | null>
  updateWorktreeStatus(
    worktreeId: string,
    status: WorktreeStatus
  ): Promise<void>
  listWorktrees(): Promise<WorktreeRecord[]>

  // Artifacts
  registerArtifact(artifact: ArtifactRecord): Promise<void>
  getArtifact(artifactId: string): Promise<ArtifactRecord | null>
  getArtifactsByNode(runId: string, nodeId: string): Promise<ArtifactRecord[]>

  // Events (audit log)
  logEvent(event: EventRecord): Promise<void>
  getEvents(filter: EventFilter): Promise<EventRecord[]>

  // Command Approvals
  getApprovedCommands(): Promise<ApprovedCommand[]>
  approveCommand(approval: CommandApproval): Promise<void>
  revokeApproval(commandPath: string): Promise<void>
}

type RunState =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'interrupted'
  | 'cancelled'
type NodeState =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'blocked'
  | 'interrupted'
  | 'timed_out'
type WorktreeStatus =
  | 'active'
  | 'merged'
  | 'abandoned'
  | 'missing'
  | 'discovered'
  | 'conflict'
```

### 3. WorktreeManager

Git worktreeのライフサイクル管理を担当する。

```typescript
interface WorktreeManager {
  // Worktree operations
  create(runId: string, baseBranch?: string): Promise<WorktreeInfo>
  list(): Promise<WorktreeInfo[]>
  remove(worktreeId: string): Promise<void>

  // Branch operations
  getDefaultBranch(): Promise<string>
  merge(worktreeId: string): Promise<MergeResult> // Always merges to base branch (same as creation source)

  // Reconciliation
  reconcileWithDB(): Promise<ReconciliationResult>
}

interface WorktreeInfo {
  id: string
  path: string
  branch: string
  baseBranch: string
  runId: string
}

interface ReconciliationResult {
  missing: string[] // In DB but not on filesystem → status updated to 'missing'
  discovered: string[] // On filesystem but not in DB → status updated to 'discovered'
  unchanged: string[] // Matched and status unchanged
  conflict: string[] // Merge conflicts detected → status updated to 'conflict'
}
```

### 4. AgentAdapter

外部Agent/CLIの実行とI/O統一を担当する。

```typescript
interface AgentAdapter {
  execute(task: AgentTask): Promise<AgentResult>
  cancel(taskId: string): Promise<void>
}

interface AgentTask {
  taskId: string
  nodeId: string
  runId: string
  config: ResolvedAgentConfig // AgentConfig + LocalOverrides merged
  input: TaskInput
  context: ExecutionContext
}

// AgentConfig (from Flow JSON) + LocalOverrides merged at execution time
interface ResolvedAgentConfig {
  type: 'stdio-json'
  command: string
  args: string[] // From LocalOverrides.agents[command].args or []
  adapterCommand?: string // From LocalOverrides.agents[command].adapterCommand
  envAllowlist: string[] // From AgentConfig.envAllowlist or []
  envDenylist: string[] // From LocalOverrides.agents[command].envDenylist or defaults
  timeoutSec: number // From LocalOverrides.agents[command].timeoutSec or global default
}

// Resolution flow:
// 1. Load AgentConfig from Flow JSON (command, envAllowlist)
// 2. Load LocalOverrides from .lumberjack/local/overrides.json
// 3. Merge: ResolvedAgentConfig = AgentConfig + LocalOverrides.agents[command] + defaults

interface TaskInput {
  goal: string
  promptTemplate?: string
  artifacts: Record<string, string> // name -> absolute path
  constraints?: TaskConstraints
}

interface ExecutionContext {
  runId: string
  nodeId: string
  flowId: string
  worktreePath: string
  branchName: string
  baseBranch: string
  defaultBranch: string // Repository's default branch
  repositoryUrl?: string
  constraints?: {
    // Project-level constraints
    allowedCommands?: string[]
    maxTimeout?: number
  }
  previousNodeResults?: NodeResultSummary[]
}

interface AgentResult {
  success: boolean
  exitCode: number
  stdout: string
  stderr: string
  resultBlock?: unknown // Parsed ===RESULT=== JSON
  duration: number
}
```

### 5. ProcessManager

プロセスのライフサイクル管理を担当する。

```typescript
interface ProcessManager {
  spawn(config: SpawnConfig): Promise<ProcessHandle>
  kill(processId: string, signal?: NodeJS.Signals): Promise<void>
  killAll(): Promise<void>
  getProcess(processId: string): ProcessHandle | undefined
  listProcesses(): ProcessHandle[]
}

interface SpawnConfig {
  command: string
  args: string[]
  cwd: string
  env: Record<string, string>
  timeout?: number
  stdin?: string
}

interface ProcessHandle {
  id: string
  pid: number
  runId: string
  nodeId: string
  stdout: Readable
  stderr: Readable
  stdin: Writable
  exitPromise: Promise<ProcessResult>
}
```

### 6. RunEngine

Flow実行の依存解決と並列実行を担当する。

```typescript
interface RunEngine {
  // Execution
  startRun(flowId: string, options?: RunOptions): Promise<Run>
  resumeRun(runId: string): Promise<Run>
  rerunNodes(runId: string, nodeIds: string[]): Promise<Run>
  cancelRun(runId: string): Promise<void>

  // Validation
  validateFlow(flow: Flow): ValidationResult
  detectCycles(flow: Flow): string[][] | null

  // State queries
  getRunStatus(runId: string): Promise<RunStatus>
}

interface RunOptions {
  baseBranch?: string
  concurrencyLimit?: number
}

interface RunStatus {
  runId: string
  state: RunState
  nodeStates: Record<string, NodeState>
  progress: { completed: number; total: number }
}
```

### 7. IPC API

Renderer-Main間の通信インターフェース。

```typescript
// preload.js で公開されるAPI
interface LumberjackAPI {
  // Flow operations
  flow: {
    list(): Promise<FlowLoadResult[]> // Returns readOnly/migrated flags for each flow
    get(flowId: string): Promise<FlowLoadResult> // Returns readOnly/migrated flags
    save(flow: Flow): Promise<void>
    delete(flowId: string): Promise<void>
  }

  // Run operations
  run: {
    start(flowId: string, options?: RunOptions): Promise<Run>
    resume(runId: string): Promise<Run>
    rerun(runId: string, nodeIds: string[]): Promise<Run>
    cancel(runId: string): Promise<void>
    getStatus(runId: string): Promise<RunStatus>
    list(flowId?: string): Promise<RunSummary[]>
  }

  // Worktree operations
  worktree: {
    list(): Promise<WorktreeInfo[]>
    merge(worktreeId: string): Promise<MergeResult>
    remove(worktreeId: string): Promise<void>
  }

  // Event streaming
  events: {
    onNodeStateChange(callback: (event: NodeStateEvent) => void): () => void
    onProcessLog(callback: (event: ProcessLogEvent) => void): () => void
    onRunStateChange(callback: (event: RunStateEvent) => void): () => void
  }

  // Command approval
  approval: {
    getPendingApprovals(): Promise<PendingApproval[]>
    approve(approvalId: string): Promise<void>
    reject(approvalId: string): Promise<void>
  }
}
```

## Data Models

### StateDB Schema (SQLite)

```sql
-- Schema version tracking
CREATE TABLE schema_info (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Runs
CREATE TABLE runs (
  id TEXT PRIMARY KEY,
  flow_id TEXT NOT NULL,
  worktree_id TEXT,
  state TEXT NOT NULL DEFAULT 'pending',
  base_branch TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at TEXT
);

-- Node execution states
CREATE TABLE node_states (
  run_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT 'pending',
  exit_code INTEGER,
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  PRIMARY KEY (run_id, node_id),
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

-- Worktrees
CREATE TABLE worktrees (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  branch TEXT NOT NULL,
  base_branch TEXT NOT NULL,
  run_id TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  merged_at TEXT,
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

-- Artifacts
CREATE TABLE artifacts (
  id TEXT PRIMARY KEY,
  run_id TEXT NOT NULL,
  node_id TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,  -- Relative to repo root
  hash TEXT NOT NULL,
  size INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (run_id) REFERENCES runs(id)
);

-- Artifact lineage
CREATE TABLE artifact_lineage (
  artifact_id TEXT NOT NULL,
  source_artifact_id TEXT NOT NULL,
  PRIMARY KEY (artifact_id, source_artifact_id),
  FOREIGN KEY (artifact_id) REFERENCES artifacts(id),
  FOREIGN KEY (source_artifact_id) REFERENCES artifacts(id)
);

-- Event log (audit)
CREATE TABLE events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  run_id TEXT,
  node_id TEXT,
  data TEXT NOT NULL,  -- JSON, redacted
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Command approvals
CREATE TABLE approved_commands (
  id TEXT PRIMARY KEY,
  command_path TEXT NOT NULL,
  argument_patterns TEXT,  -- JSON array
  binary_hash TEXT NOT NULL,
  script_hash TEXT,  -- For script execution
  approved_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(command_path, argument_patterns)
);

-- Merge history
CREATE TABLE merges (
  id TEXT PRIMARY KEY,
  worktree_id TEXT NOT NULL,
  source_branch TEXT NOT NULL,
  target_branch TEXT NOT NULL,
  commit_hash TEXT,
  merged_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (worktree_id) REFERENCES worktrees(id)
);

-- Indexes
CREATE INDEX idx_runs_flow_id ON runs(flow_id);
CREATE INDEX idx_node_states_run_id ON node_states(run_id);
CREATE INDEX idx_artifacts_run_node ON artifacts(run_id, node_id);
CREATE INDEX idx_events_run_id ON events(run_id);
CREATE INDEX idx_events_type ON events(type);
```

### Flow JSON Schema

```typescript
interface FlowSchema {
  $schema: string
  schemaVersion: number // Current: 1
  id: string
  name: string
  description?: string
  meta: {
    baseBranch?: string
    branchPrefix?: string
    concurrencyLimit?: number
    // Note: defaultTimeout is in local overrides, not Flow JSON (R2.4)
  }
  nodes: Array<{
    id: string
    type: string
    position: { x: number; y: number }
    data: {
      label: string
      agent?: {
        type: 'stdio-json'
        command: string
        envAllowlist?: string[]
        // Note: args, adapterCommand, envDenylist, timeoutSec are in local overrides (R2.4)
      }
      promptTemplate?: string
      inputArtifacts?: Array<{
        name: string
        ref: string // e.g., '@node:requirements.output.spec'
        required?: boolean
      }>
      outputArtifacts?: Array<{
        name: string
        path: string // Relative to worktree
        schema?: string // JSON Schema reference
      }>
      contextOverrides?: Array<{
        key: string
        value: string | null // null to exclude
      }>
      [key: `x-${string}`]: unknown
    }
  }>
  edges: Array<{
    id: string
    source: string
    target: string
    sourceHandle?: string
    targetHandle?: string
  }>
}
```

### Agent Task JSON (stdin)

```typescript
interface AgentTaskJSON {
  taskId: string
  goal: string
  artifacts: Record<string, string> // name -> absolute path
  repo: {
    worktreePath: string
    baseBranch: string
    branch: string
    defaultBranch: string // Repository's default branch
    repositoryUrl?: string
  }
  context: {
    runId: string
    nodeId: string
    flowId: string
    previousResults?: Array<{
      nodeId: string
      success: boolean
      summary?: string
    }>
  }
  constraints?: {
    allowedCommands?: string[]
    maxTimeout?: number // Project-level max timeout
  }
}
```

### Agent Result Block (stdout)

```
... execution logs ...

===RESULT===
{
  "success": true,
  "summary": "Implementation completed",
  "outputs": {
    "main": "src/main.ts",
    "tests": "src/main.test.ts"
  },
  "metrics": {
    "linesAdded": 150,
    "linesRemoved": 20
  }
}
===END===
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Flow JSON Round-Trip Consistency

_For any_ valid Flow object, saving it to JSON and loading it back SHALL produce an equivalent Flow object with all fields preserved (nodes, edges, coordinates, parameters, templates, extension fields).

**Validates: Requirements 2.2, 2.10, 2.11**

### Property 2: Credential Non-Persistence

_For any_ Flow JSON file or StateDB record, scanning for known credential patterns (ghp*\*, github_pat*\*, Authorization:, Bearer, API_KEY values) SHALL return no matches.

**Validates: Requirements 2.3, 7.1, 7.5, 7.6**

### Property 3: Environment Variable Filtering

_For any_ Agent execution with envAllowlist and envDenylist configurations, the environment passed to the spawned process SHALL:

- Contain all safe baseline variables (PATH, HOME, USER, SHELL, LANG, LC*ALL, TERM, TMPDIR, XDG*\*)
- Contain only variables matching envAllowlist patterns (case-sensitive, glob-supported)
- NOT contain any variables matching envDenylist patterns, even if also in allowlist
- Denylist SHALL take precedence over allowlist

**Validates: Requirements 4.5, 4.6, 4.7**

### Property 4: Artifact Path Relativity

_For any_ artifact stored in StateDB, the path SHALL be relative to the repository root, and resolving it with any valid repository root SHALL produce a valid absolute path.

**Validates: Requirements 3.8**

### Property 5: StateDB Lock Exclusivity

_For any_ two concurrent attempts to acquire the StateDB lock for the same Project, exactly one SHALL succeed and the other SHALL fail immediately with a structured error.

**Validates: Requirements 1.5, 3.9**

### Property 6: Stale Lock Recovery

_For any_ StateDB lock held by a process that has crashed (no heartbeat for configurable timeout), a subsequent lock acquisition attempt SHALL succeed after detecting and recovering the stale lock.

**Validates: Requirements 3.10**

### Property 7: Flow Graph Cycle Detection

_For any_ Flow with cyclic dependencies in its edge definitions, the RunEngine SHALL detect the cycle and reject execution with a structured error listing the cycle path.

**Validates: Requirements 9.1**

### Property 8: Worktree Reconciliation Completeness

_For any_ set of worktrees on filesystem and in StateDB, after reconciliation:

- Worktrees in DB but not on filesystem SHALL have status updated to 'missing'
- Worktrees on filesystem but not in DB SHALL have status updated to 'discovered'
- All other worktrees SHALL remain unchanged

**Validates: Requirements 6.3, 6.4, 6.5**

### Property 9: Interrupted State Transition

_For any_ Run or Node in 'running' state when the app terminates, on next startup it SHALL be transitioned to 'interrupted' state (not 'running').

**Validates: Requirements 6.6, 8.5**

### Property 10: Command Path Normalization

_For any_ command path (relative, absolute, or with symlinks), the normalized path SHALL resolve to the same absolute path as the actual binary, preventing bypass via path manipulation.

**Validates: Requirements 12.6**

### Property 11: Dangerous Command Rejection

_For any_ command+argument combination matching the denylist (bash -c, python -c, node -e, etc.), execution SHALL be rejected regardless of approval status. Argument normalization SHALL detect equivalent forms (e.g., --noprofile -c → -c detected).

**Validates: Requirements 12.8**

### Property 12: Binary Hash Change Detection

_For any_ approved command whose binary file has been modified (hash changed), execution SHALL require re-approval and warn the user.

**Validates: Requirements 12.9**

### Property 13: Script Hash Change Detection

_For any_ approved command that executes a script file (e.g., bash script.sh), if the script content changes (hash changed), execution SHALL require re-approval.

**Validates: Requirements 12.10**

### Property 14: Parallel Execution Concurrency Limit

_For any_ Flow execution with independent nodes, the number of concurrently running nodes SHALL NOT exceed the configured concurrency limit.

**Validates: Requirements 9.3**

### Property 15: Dependent Node Triggering

_For any_ Node that completes successfully, all directly dependent Nodes (as defined by edges) SHALL be triggered for execution.

**Validates: Requirements 9.4**

### Property 16: Failed Node Blocking

_For any_ Node that fails, all directly and transitively dependent Nodes SHALL be marked as 'blocked'.

**Validates: Requirements 9.5**

### Property 17: Artifact Lineage Tracking

_For any_ Node that completes successfully with output artifacts, the artifacts SHALL be registered in StateDB with correct lineage (nodeId, runId, hash).

**Validates: Requirements 13.8, 14.1**

### Property 18: Artifact Reference Resolution

_For any_ Node with input artifact references (e.g., @node:requirements.output.spec), the references SHALL be resolved to absolute paths before Agent execution.

**Validates: Requirements 14.2, 14.3**

### Property 19: Missing Required Artifact Blocking

_For any_ Node with required input artifacts, if any required artifact is missing or invalid, the Node SHALL be blocked with a structured error.

**Validates: Requirements 14.4**

### Property 20: Artifact Invalidation Propagation

_For any_ Node that is re-run and produces different artifacts (hash changed), all downstream Nodes that depend on those artifacts SHALL be invalidated.

**Validates: Requirements 14.6**

### Property 21: Context Redaction

_For any_ execution context passed to an Agent, sensitive information matching redaction patterns SHALL be removed before passing.

**Validates: Requirements 15.5**

### Property 22: Process Timeout Enforcement

_For any_ Agent process that exceeds the configured timeout, the process SHALL be terminated and the Node SHALL be marked as 'timed_out'.

**Validates: Requirements 4.8, 4.9**

### Property 23: Graceful Process Cancellation

_For any_ process cancellation request, the ProcessManager SHALL send SIGTERM first, wait for a configurable grace period, then send SIGKILL if the process is still running.

**Validates: Requirements 8.3**

### Property 24: Audit Log Redaction

_For any_ command audit record logged to StateDB, the args field SHALL have redaction patterns applied before storage.

**Validates: Requirements 8.8**

### Property 25: Schema Migration Atomicity

_For any_ StateDB migration, it SHALL be applied within a transaction; if the migration fails, no partial changes SHALL be persisted.

**Validates: Requirements 3.7, 11.3**

### Property 26: Default Branch Fallback

_For any_ repository where `git symbolic-ref refs/remotes/origin/HEAD` fails, the WorktreeManager SHALL fall back to checking for 'main' or 'master' branches, and SHALL report an error if no default can be determined.

**Validates: Requirements 5.6**

### Property 27: Worktree Branch Uniqueness

_For any_ two worktrees created for different Runs, their branch names SHALL be unique (including runId and collision-resistant suffix).

**Validates: Requirements 5.7**

### Property 28: Shell Injection Prevention

_For any_ external command execution, the command SHALL be spawned with shell=false and arguments as an array, preventing shell injection.

**Validates: Requirements 8.7**

## Error Handling

### Error Categories

```typescript
enum ErrorCode {
  // Flow errors (1xxx)
  FLOW_NOT_FOUND = 1001,
  FLOW_INVALID_SCHEMA = 1002,
  FLOW_INCOMPATIBLE_VERSION = 1003,
  FLOW_CYCLE_DETECTED = 1004,

  // StateDB errors (2xxx)
  DB_LOCK_HELD = 2001,
  DB_MIGRATION_FAILED = 2002,
  DB_CORRUPTION = 2003,

  // Worktree errors (3xxx)
  WORKTREE_CREATE_FAILED = 3001,
  WORKTREE_NOT_FOUND = 3002,
  WORKTREE_MERGE_CONFLICT = 3003,
  DEFAULT_BRANCH_NOT_FOUND = 3004,

  // Agent errors (4xxx)
  AGENT_SPAWN_FAILED = 4001,
  AGENT_TIMEOUT = 4002,
  AGENT_CANCELLED = 4003,
  AGENT_RESULT_PARSE_ERROR = 4004,

  // Security errors (5xxx)
  COMMAND_NOT_APPROVED = 5001,
  COMMAND_NOT_IN_ALLOWLIST = 5002,
  COMMAND_DANGEROUS = 5003,
  COMMAND_BINARY_CHANGED = 5004,
  COMMAND_SCRIPT_CHANGED = 5005,

  // Artifact errors (6xxx)
  ARTIFACT_NOT_FOUND = 6001,
  ARTIFACT_INVALID = 6002,
  ARTIFACT_REFERENCE_ERROR = 6003,

  // Run errors (7xxx)
  RUN_NOT_FOUND = 7001,
  RUN_ALREADY_RUNNING = 7002,
  NODE_BLOCKED = 7003,
}

interface StructuredError {
  code: ErrorCode
  message: string
  details?: Record<string, unknown>
  cause?: Error
}
```

### Error Recovery Strategies

| Error                   | Recovery Strategy                                                            |
| ----------------------- | ---------------------------------------------------------------------------- |
| DB_LOCK_HELD            | Display error with conflicting process info, suggest closing other instance  |
| DB_MIGRATION_FAILED     | Abort startup, display migration error, suggest manual intervention          |
| WORKTREE_MERGE_CONFLICT | Mark worktree as 'conflict', display conflict files, allow manual resolution |
| AGENT_TIMEOUT           | Mark node as 'timed_out', allow retry with increased timeout                 |
| COMMAND_NOT_APPROVED    | Display approval dialog, allow user to approve or reject                     |
| COMMAND_BINARY_CHANGED  | Display warning with hash diff, require re-approval                          |
| ARTIFACT_NOT_FOUND      | Block dependent node, display missing artifact info                          |

## Testing Strategy

### Unit Tests

Unit tests verify specific examples and edge cases:

- FlowStore: JSON parsing, schema validation, migration edge cases
- StateDB: CRUD operations, lock acquisition, migration rollback
- WorktreeManager: Branch name generation, reconciliation logic
- AgentAdapter: Environment filtering, result block parsing
- RunEngine: Cycle detection, dependency resolution, state transitions

### Property-Based Tests

Property-based tests verify universal properties across all inputs using fast-check:

```typescript
// Example: Property 1 - Flow JSON Round-Trip
import * as fc from 'fast-check'

describe('FlowStore', () => {
  it('Property 1: Flow JSON round-trip preserves all fields', () => {
    fc.assert(
      fc.property(flowArbitrary, async (flow) => {
        await flowStore.save(flow)
        const result = await flowStore.load(flow.id)
        expect(result.flow).toEqual(flow)
        expect(result.readOnly).toBe(false)
      }),
      { numRuns: 100 }
    )
  })
})
```

### Test Configuration

- Property-based tests: minimum 100 iterations per property
- Each property test references its design document property number
- Tag format: **Feature: lumberjack, Property {number}: {property_text}**

### Integration Tests

- End-to-end Flow execution with mock agents
- Worktree lifecycle (create → execute → merge → cleanup)
- Startup recovery from interrupted state
- IPC API contract verification
