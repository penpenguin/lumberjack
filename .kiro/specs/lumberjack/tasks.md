# Task List: Lumberjack（詳細・優先度順）

> 優先度: P0=最優先（MVP基盤/安全性/永続化） / P1=主要機能 / P2=拡張・UI充実 / P3=補助ドキュメント

## P0. 事前準備 / 基盤（MVP）

- [x] リポジトリ構成の確定（packages/main, packages/renderer, packages/preload, packages/core, packages/shared）
- [x] TypeScript 設計（tsconfig base/paths、module target、build 分離）
- [x] ビルド基盤の決定（Vite/ESBuild/Electron builder）と最小起動
- [x] lint/format 基盤（ESLint/Prettier）と pre-commit 設定
- [x] WSLg 前提の起動手順（dev/prod）叩き台
- [x] テスト基盤（Vitest + jsdom）導入、最小テスト実行確認

## P0. FlowStore（Flow 定義・スキーマ管理）

- [x] Flow JSON スキーマ定義（schemaVersion, nodes, edges, meta, x-\* 拡張）
- [x] FlowStore インターフェース定義（loadAll/load/save/delete）
- [x] バリデーション実装（schema validation、構造化エラー）
- [x] schemaVersion 互換ロジック（in-memory migrate）
- [x] readOnly 判定（新し過ぎる schemaVersion）
- [x] 明示 save 時のみ migrate 書き戻し
- [x] Local overrides スキーマ定義（flow/agent/global）
- [x] overrides 読み書き（.lumberjack/local/overrides.json）
- [x] overrides 優先順位の解決（agent > flow > global > default）
- [x] .lumberjack/local の git-ignored 化

## P0. StateDB（SQLite Wasm 永続化）

- [x] DB スキーマ設計（runs, node_states, worktrees, artifacts, events, approvals）
- [x] node-sqlite3-wasm 組み込みの検証
- [x] Migrations 仕組み（versioned + transactional）
- [x] StateDB open/close/lock API 実装
- [x] file lock + heartbeat + stale recovery
- [x] Run CRUD 実装（create/get/update/list）
- [x] NodeState CRUD 実装（get/update）
- [x] Worktree CRUD 実装（create/get/update/list）
- [x] Artifact CRUD 実装（register/get/listByNode）
- [x] Event/audit log 実装（record/list）
- [x] artifact 相対パス保存・絶対パス解決

## P0. ProcessManager（安全なプロセス管理）

- [x] spawn ラッパー（shell=false, args 配列）
- [x] stdin/stdout/stderr 分離捕捉
- [x] タイムアウト/キャンセル（SIGTERM → SIGKILL）
- [x] 実行監査ログ（command/args/cwd/exitCode/duration）
- [x] orphaned プロセス記録と起動時対応

## P0. Command Approval（安全実行）

- [x] approved commands テーブル設計（path/hash/arg patterns）
- [x] コマンド正規化（実パス解決/シンボリックリンク）
- [x] 新規コマンド検知（Flow 実行前）
- [x] dangerous denylist 検知（bash -c, python -c, node -e 等）
- [x] global allowlist 適用
- [x] バイナリ/スクリプト hash 変更検知と再承認
- [x] 承認フローの構造化エラー/結果設計

## P0. IPC API（最小安全 API）

- [x] IPC 契約定義（Flow CRUD/Run/Worktree/Status/Events）
- [x] preload + contextBridge 実装（contextIsolation）
- [x] Renderer から FS/exec を直接呼べない制限
- [x] structured error レスポンス統一
- [x] streaming events 仕様（node state/process logs）

## P1. WorktreeManager（Git worktree 管理）

- [ ] default branch 解決（origin/HEAD → main/master）
- [ ] create/list/remove 実装（git CLI）
- [ ] runId ベースのユニーク命名
- [ ] merge 実行と events 記録
- [ ] worktree status の StateDB 反映

## P1. AgentAdapter（外部 Agent 実行）

- [ ] 標準 task JSON スキーマ定義（context/artifacts/prompt）
- [ ] env allow/deny 解決（glob、deny 優先、case-sensitive）
- [ ] adapter command 対応（wrapper script）
- [ ] stdout 解析（RESULT ブロック）/stderr 分離
- [ ] redaction ルール適用（ログ/コンテキスト）

## P1. RunEngine（フロー実行）

- [ ] Flow DAG 検証（循環検出）
- [ ] 依存解決・並列実行（concurrency limit）
- [ ] Node 状態遷移の永続化（StateDB）
- [ ] 失敗/ブロック/再実行の制御
- [ ] interrupted 復帰時の再実行制御

## P1. Artifact/Context 管理

- [ ] Node 入出力アーティファクト定義
- [ ] output 検証（存在/スキーマ）と失敗処理
- [ ] lineage 登録と参照解決（@node:...）
- [ ] optional input の扱い
- [ ] contextOverrides + 前段要約の組み立て

## P1. 起動時復帰（Startup Recovery）

- [ ] 起動時 StateDB open + migrations
- [ ] Flow 一括ロード（readOnly/migrated 情報付与）
- [ ] worktree scan と StateDB 突合（missing/discovered）
- [ ] running → interrupted への遷移
- [ ] 最終 Project/Flow の復元

## P2. Renderer UI

- [ ] ReactFlow Editor（Flow 編集/保存）
- [ ] Run Status Dashboard（状態/ログ/再実行）
- [ ] Worktree Panel（一覧/状態/マージ）
- [ ] コマンド承認ダイアログ
- [ ] interrupted 復帰 UI

## P2. スキーマ互換/移行の補強

- [ ] Flow schema migration ルール文書化
- [ ] StateDB migration エラー報告の UI 表示
- [ ] migration status の IPC 公開

## P2. SDLC フェーズ支援

- [ ] 既定テンプレート/アーティファクトの紐付け
- [ ] Node phase に応じた UI 補助

## P2. テスト戦略（t-wada TDD 準拠）

- [ ] FlowStore/StateDB/RunEngine/AgentAdapter のユニットテスト
- [ ] ProcessManager/WorktreeManager の CLI モックテスト
- [ ] IPC コントラクトのテスト
- [ ] 主要フローの結合テスト（最小限）

## P3. ドキュメント/サンプル

- [ ] Flow/Node/Artifact の JSON サンプル
- [ ] local overrides のサンプル
- [ ] 既知の制約（WSLg、依存 CLI）記載
