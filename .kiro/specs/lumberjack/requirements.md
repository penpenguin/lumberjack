# Requirements Document

## Introduction

Lumberjack（以下「本システム」）は、SDLC（ソフトウェア開発ライフサイクル）の各工程をノードとして可視化・実行するローカル完結型のデスクトップアプリケーションである。外部のAIエージェント（Codex、Claude Code、aider等）をspawnで呼び出し、Git worktreeベースの並列開発フローを管理する。サーバレス設計により、認証情報をアプリ側で保持せず、既存のCLI認証機構に依存する。

初期の対象環境は WSLg（Linux）とする。

## Glossary

- **Orchestrator**: Electron main processで動作する実行エンジン。フロー実行、Agent spawn、DB書き込み、Git操作を統括する
- **Flow**: SDLC工程を表すノードとエッジの有向グラフ。JSON形式で保存される
- **Node**: Flow内の単一工程（例：要件定義、設計、実装、テスト）
- **Run**: Flowの1回の実行インスタンス。状態と履歴を持つ
- **Worktree**: Git worktree。並列開発のための独立した作業ディレクトリ
- **Agent**: 外部CLI/AIツール（Codex、Claude Code、aider等）。stdin/stdoutで通信する
- **AgentAdapter**: 各種Agentの入出力を統一プロトコルに変換するレイヤー。ラッパースクリプトによるツール固有フォーマット変換をサポートする
- **StateDB**: SQLite（Wasm）による状態・履歴の永続化データベース
- **Renderer**: ReactFlow UIを用いた表示・編集専用のフロントエンド
- **Project**: 本システムで開かれたローカルGitリポジトリのルートディレクトリ。`git rev-parse --show-toplevel`で検出される

## Requirements

### Requirement 1: サーバレスアーキテクチャ

**User Story:** As a developer, I want the app to run entirely locally without backend servers, so that I can use it offline and maintain full control over my data.

#### Acceptance Criteria

1. THE Orchestrator SHALL run locally inside the Electron application and MAY spawn local child processes (git, agents, tests) as needed, without using any external backend servers
2. WHEN the Renderer requests an operation, THE Orchestrator SHALL process it via IPC and return results
3. THE Renderer SHALL only perform display and editing operations, delegating all execution to the Orchestrator
4. WHEN network access is required for Git operations, THE Orchestrator SHALL use local CLI commands (git, gh, glab) that handle their own authentication
5. THE Orchestrator SHALL enforce single-instance per Project using file-based locking on StateDB to prevent concurrent access corruption

### Requirement 2: Flow定義の管理

**User Story:** As a developer, I want to define and save development workflows as visual graphs, so that I can reuse and share them across projects.

#### Acceptance Criteria

1. THE FlowStore SHALL persist Flow definitions as JSON files in the repository (e.g., `.lumberjack/flows/*.json`)
2. WHEN a Flow is created or modified, THE FlowStore SHALL save nodes, edges, coordinates, parameters, and templates
3. THE Flow JSON SHALL NOT contain any authentication credentials or secrets
4. WHEN a Flow references an Agent, THE Flow JSON SHALL store only the agent type, command name, and environment variable allowlist (not values)
5. THE FlowStore SHALL support local override files (e.g., `.lumberjack/local/overrides.json`) for machine-specific configurations
6. THE Flow JSON SHALL include a schemaVersion field for compatibility management
7. WHEN loading Flow definitions, THE FlowStore SHALL migrate older schemas in-memory and SHALL only write back the migrated version on explicit save
8. IF a Flow JSON has a newer schemaVersion than supported, THEN THE FlowStore SHALL load it in read-only mode and report an incompatibility error
9. THE FlowStore SHALL ensure local override files (e.g., `.lumberjack/local/*`) are git-ignored and never exported or shared by default
10. WHEN loading a Flow JSON, THE FlowStore SHALL validate it against the schema and SHALL reject malformed or partially corrupted files with a structured error
11. THE Flow JSON schema SHALL support extension fields (prefixed with `x-`) for custom Node types, and THE FlowStore SHALL preserve unknown extension fields during load/save

### Requirement 3: 状態・履歴の永続化

**User Story:** As a developer, I want run history and execution states to be persisted, so that I can track progress and resume interrupted work.

#### Acceptance Criteria

1. THE StateDB SHALL use SQLite (Wasm) via node-sqlite3-wasm for persistence
2. THE StateDB SHALL store runs, node execution states, worktree records, merge history, and event logs
3. WHEN storing large artifacts (logs, generated files), THE StateDB SHALL store only file references (path, hash, metadata), not full content
4. THE StateDB file SHALL be located in git common directory (resolved via `git rev-parse --git-common-dir`) to be shared across worktrees
5. WHEN the database is opened, THE StateDB SHALL apply pending migrations automatically
6. THE StateDB SHALL track its schemaVersion and apply migrations automatically on open
7. IF a migration fails, THEN THE Orchestrator SHALL abort startup and report a structured error without partially applied changes
8. THE StateDB SHALL store artifact paths relative to the repository root and SHALL resolve absolute paths at runtime
9. WHEN acquiring the StateDB lock, THE Orchestrator SHALL fail immediately if the lock is held by another instance and SHALL report a structured error indicating the conflicting process
10. THE StateDB lock SHALL include a heartbeat mechanism to detect and recover from stale locks (e.g., crashed processes) after a configurable timeout

### Requirement 4: 外部Agent実行

**User Story:** As a developer, I want to use various AI agents installed in my environment, so that I can leverage different tools for different tasks.

#### Acceptance Criteria

1. WHEN a Node requires Agent execution, THE AgentAdapter SHALL spawn the configured external command with stdin/stdout communication
2. THE AgentAdapter SHALL pass a standardized task JSON to the Agent via stdin
3. THE AgentAdapter SHALL capture stdout as execution log and parse result blocks (e.g., `===RESULT===` JSON)
4. THE AgentAdapter SHALL capture stderr separately for error logging
5. THE AgentAdapter SHALL construct a minimal safe baseline environment (PATH, HOME, USER, SHELL, LANG, LC*ALL, TERM, TMPDIR, XDG*\*) and SHALL additionally pass only variables listed in envAllowlist
6. THE AgentAdapter SHALL NOT pass variables matching envDenylist patterns (e.g., AWS\_\*, GITHUB_TOKEN, OPENAI_API_KEY by default) even if allowlisted; denylist SHALL take precedence over allowlist
7. THE AgentAdapter SHALL treat environment variable names as case-sensitive and SHALL support glob patterns (e.g., AWS\_\*) for both allowlist and denylist matching
8. THE AgentAdapter SHALL support configurable timeout and cancellation for long-running processes
9. IF an Agent process exceeds the configured timeout, THEN THE AgentAdapter SHALL terminate the process and mark the Node as timed_out
10. THE AgentAdapter SHALL support adapter commands (wrapper scripts) that translate the standardized task JSON into tool-specific invocation formats

### Requirement 5: Git Worktree管理

**User Story:** As a developer, I want to manage multiple worktrees for parallel development, so that I can work on multiple features simultaneously.

#### Acceptance Criteria

1. THE WorktreeManager SHALL create, list, and remove Git worktrees using git CLI commands
2. WHEN a Run starts, THE WorktreeManager SHALL create a dedicated worktree branching from the base branch specified in Flow configuration (defaulting to the repository's default branch)
3. THE WorktreeManager SHALL track worktree status (active, merged, abandoned) in StateDB
4. WHEN a worktree is merged, THE WorktreeManager SHALL merge to the base branch specified in Flow configuration (same as the branch it was created from) and SHALL record the merge event
5. THE WorktreeManager SHALL NOT store or access any Git credentials directly
6. WHEN determining the default branch, THE WorktreeManager SHALL try `git symbolic-ref refs/remotes/origin/HEAD`, then fall back to checking for `main` or `master` branches, and SHALL report an error if no default can be determined
7. THE WorktreeManager SHALL generate unique branch/worktree names by including runId and a collision-resistant suffix (e.g., short random string)

### Requirement 6: 起動時復帰

**User Story:** As a developer, I want the app to restore my previous session state on startup, so that I can continue where I left off.

#### Acceptance Criteria

1. WHEN the app starts, THE Orchestrator SHALL open StateDB and apply migrations
2. WHEN the app starts, THE FlowStore SHALL load all Flow definitions from the repository
3. WHEN the app starts, THE WorktreeManager SHALL scan actual worktrees (via `git worktree list --porcelain`) and reconcile with StateDB
4. IF a worktree exists in StateDB but not on filesystem, THEN THE WorktreeManager SHALL mark it as missing
5. IF a worktree exists on filesystem but not in StateDB, THEN THE WorktreeManager SHALL mark it as discovered
6. IF a Run or Node was in running state when the app last closed, THEN THE Orchestrator SHALL transition it to interrupted state
7. WHEN a Run is in interrupted state, THE Renderer SHALL display resume and re-run options to the user
8. THE Orchestrator SHALL restore the previously opened Flow and selected Project from Electron userData

### Requirement 7: 認証情報非保持

**User Story:** As a developer, I want the app to never store my credentials, so that my secrets remain secure in my existing credential management systems.

#### Acceptance Criteria

1. THE Orchestrator SHALL NOT store, retrieve, or display any authentication tokens
2. WHEN Git authentication is required, THE Orchestrator SHALL rely on SSH agent, credential helper, or environment variables managed externally
3. WHEN PR operations are required, THE Orchestrator SHALL execute gh/glab CLI commands that use their own authentication state
4. IF a CLI command fails due to missing authentication, THEN THE Orchestrator SHALL report the failure without attempting to acquire credentials
5. WHEN storing execution logs, THE Orchestrator SHALL apply redaction patterns (e.g., `ghp_*`, `github_pat_*`, `Authorization:` headers) before persistence
6. THE Flow JSON and StateDB SHALL NOT contain any credential values, only environment variable names in allowlists

### Requirement 8: プロセス管理

**User Story:** As a developer, I want reliable process management for Agent execution, so that I can monitor, cancel, and recover from failures.

#### Acceptance Criteria

1. THE ProcessManager SHALL track all spawned processes with their run/node associations
2. WHEN a process is spawned, THE ProcessManager SHALL capture stdin, stdout, and stderr streams
3. THE ProcessManager SHALL support graceful cancellation (SIGTERM followed by SIGKILL after timeout)
4. WHEN a process completes, THE ProcessManager SHALL update the Node state and store execution results
5. IF the app terminates while processes are running, THEN THE ProcessManager SHALL mark those processes as orphaned; on next startup, THE Orchestrator SHALL NOT attempt to reconnect but SHALL transition associated Nodes to interrupted state for user-initiated re-execution
6. THE ProcessManager SHALL enforce configurable resource limits (timeout, max concurrent processes)
7. THE Orchestrator SHALL execute external commands with shell=false and argument arrays to prevent shell injection
8. THE ProcessManager SHALL log command audit records (command, args, cwd, exitCode, duration) to StateDB events table with redaction patterns applied to args

### Requirement 9: Flow実行エンジン

**User Story:** As a developer, I want the flow execution to handle dependencies and parallel execution, so that my workflows run efficiently.

#### Acceptance Criteria

1. BEFORE execution, THE RunEngine SHALL validate the Flow graph and SHALL reject cyclic dependencies with a structured error
2. THE RunEngine SHALL resolve Node dependencies based on edge definitions before execution
3. THE RunEngine SHALL execute independent Nodes in parallel up to a configured concurrency limit
4. WHEN a Node completes successfully, THE RunEngine SHALL trigger dependent Nodes
5. IF a Node fails, THEN THE RunEngine SHALL mark dependent Nodes as blocked and allow retry
6. THE RunEngine SHALL persist state transitions to StateDB for each Node
7. WHEN resuming an interrupted Run, THE RunEngine SHALL treat previously running nodes as pending and SHALL re-run them, skipping only completed nodes
8. THE RunEngine SHALL support re-run mode that forces re-execution of specified nodes regardless of completion status

### Requirement 10: IPC API設計

**User Story:** As a developer, I want a minimal and secure IPC interface, so that the Renderer can safely interact with the Orchestrator.

#### Acceptance Criteria

1. THE Orchestrator SHALL expose IPC APIs only through Electron preload scripts with contextIsolation enabled
2. THE IPC API SHALL provide methods for: Flow CRUD, Run management, Worktree operations, and status queries
3. THE IPC API SHALL NOT expose direct file system access or shell execution to the Renderer
4. WHEN an IPC call fails, THE Orchestrator SHALL return structured error responses with error codes and messages
5. THE IPC API SHALL support streaming events for node state changes and process logs

### Requirement 11: スキーマ互換性と移行方針

**User Story:** As a developer, I want persisted Flow and State data to remain usable across app versions, so that upgrades do not break my workflows.

#### Acceptance Criteria

1. THE FlowStore SHALL support forward-only migrations from older schema versions to the latest schemaVersion
2. THE FlowStore SHALL record the applied migration version and update the Flow JSON on save
3. THE StateDB migrations SHALL be versioned, ordered, and applied within a transaction to ensure atomicity
4. THE Orchestrator SHALL expose migration status and errors in a structured form to the Renderer
5. THE StateDB SHALL be the sole owner of migration application; THE FlowStore SHALL only perform in-memory schema upgrades during load

### Requirement 12: Flow実行の安全性

**User Story:** As a developer, I want the app to protect me from accidentally running malicious or untrusted commands, so that my system remains secure.

#### Acceptance Criteria

1. THE Orchestrator SHALL require explicit user confirmation before running a Flow that introduces new executable commands not previously approved for that Project
2. THE Orchestrator SHALL maintain a per-Project approved commands list in StateDB, storing command path, argument patterns, and binary hash at approval time
3. WHEN a Flow contains commands not in the approved list, THE Renderer SHALL display a confirmation dialog showing the new commands and their arguments before execution
4. THE Orchestrator SHALL support a global command allowlist that restricts executable commands regardless of Flow definitions
5. IF a Flow attempts to execute a command not in the global allowlist, THEN THE Orchestrator SHALL reject execution with a structured error
6. THE Orchestrator SHALL normalize command paths before approval matching by resolving to absolute paths and following symlinks to prevent bypass via path manipulation
7. THE Orchestrator SHALL treat adapter commands (wrapper scripts) as the approved command, and the wrapper script SHALL be responsible for any sub-commands it invokes
8. THE Orchestrator SHALL reject commands that use shell interpreters with inline code execution by maintaining a denylist of dangerous command+argument combinations; matching SHALL use exact command name match AND prefix match on arguments (e.g., `bash` + `-c` prefix, `python` + `-c` prefix, `node` + `-e` prefix); argument normalization SHALL collapse equivalent forms (e.g., `--noprofile -c` → `-c` detected)
9. WHEN an approved command's binary hash changes, THE Orchestrator SHALL require re-approval and SHALL warn the user of the modification
10. WHEN a command executes a script file (e.g., `bash script.sh`, `python script.py`), THE Orchestrator SHALL also compute and store the script file's hash at approval time and SHALL require re-approval if the script content changes
11. THE Orchestrator SHALL support argument pattern rules (exact match, prefix match) for command approval; regex patterns SHALL NOT be supported to avoid ReDoS and complexity

### Requirement 13: SDLC工程ノードの支援

**User Story:** As a developer, I want each node to support specific SDLC phases with appropriate templates and artifacts, so that I can follow a structured development process.

#### Acceptance Criteria

1. THE Node SHALL support predefined SDLC phase types: requirements, design, implementation, test, review, deploy
2. WHEN a Node is created with an SDLC phase type, THE FlowStore SHALL associate default templates and artifact schemas for that phase
3. THE Node SHALL support input/output artifact definitions that specify expected file types and validation rules
4. WHEN a Node completes, THE Orchestrator SHALL validate that required output artifacts exist and conform to their schemas
5. IF artifact validation fails, THEN THE Orchestrator SHALL mark the Node as failed, record the validation error, and SHALL NOT register the artifacts in lineage tracking
6. THE Node SHALL support prompt templates with variable interpolation (e.g., `${previousNode.output}`, `${worktree.path}`)
7. WHEN an Agent executes a Node, THE AgentAdapter SHALL inject the Node's prompt template and artifact references into the task JSON
8. THE Node SHALL track artifact lineage (which Node produced which artifact) in StateDB for traceability
9. THE FlowStore SHALL support custom Node types beyond predefined SDLC phases for extensibility

### Requirement 14: ノード間のアーティファクト連携

**User Story:** As a developer, I want artifacts produced by one node to be automatically available to dependent nodes, so that the workflow progresses seamlessly.

#### Acceptance Criteria

1. WHEN a Node completes successfully, THE Orchestrator SHALL register its output artifacts in StateDB with metadata (path, hash, nodeId, runId)
2. WHEN a dependent Node starts, THE Orchestrator SHALL resolve input artifact references and provide absolute paths to the Agent
3. THE Orchestrator SHALL support artifact reference syntax in Node configurations (e.g., `@node:requirements.output.spec`)
4. IF a required input artifact is missing or invalid, THEN THE Orchestrator SHALL block the Node and report a structured error
5. THE Orchestrator SHALL support optional input artifacts that do not block execution if missing
6. WHEN artifacts are updated by re-running a Node, THE Orchestrator SHALL invalidate downstream Nodes that depend on the changed artifacts

### Requirement 15: ノード実行コンテキストの提供

**User Story:** As a developer, I want each node execution to have access to relevant context, so that Agents can make informed decisions.

#### Acceptance Criteria

1. THE AgentAdapter SHALL provide execution context including: runId, nodeId, flowId, worktreePath, branchName, and previousNodeResults
2. THE AgentAdapter SHALL include project-level context: repository URL, default branch, and configured constraints
3. WHEN a Node has predecessors, THE AgentAdapter SHALL include summaries of predecessor outputs in the task JSON
4. THE Node SHALL support context overrides that allow Flow authors to customize what context is passed to Agents
5. THE AgentAdapter SHALL redact sensitive information from context before passing to Agents (applying the same redaction patterns as log storage)
