# Implementation Plan: Windows実行可能ビルドとLLM HTTP接続設定

**Branch**: `003-windows-build-llm-http` | **Date**: 2026-01-13 | **Spec**: /home/user/repository/nativox-translate/specs/003-windows-build-llm-http/spec.md
**Input**: Feature specification from `/specs/003-windows-build-llm-http/spec.md`

## Summary

Windows向け配布ビルドを生成可能にし、LLM接続先をHTTP/HTTPSの任意URL（パス・ポート・localhost含む）として指定できるようにする。既存のデスクトップアプリ構成に合わせ、設定の保存・検証・エラーハンドリングを追加し、LLM操作は常に設定済み接続先へ送信する。

## Technical Context

**Language/Version**: TypeScript 5.7 (ESM)  
**Primary Dependencies**: Electron 33, React 18, electron-vite, zod, node-sqlite3-wasm  
**Storage**: Local SQLite (StateDB)  
**Testing**: Vitest + jsdom  
**Target Platform**: Windows 10/11 (64-bit) desktop app  
**Project Type**: Electron desktop app (monorepo packages)  
**Performance Goals**: 起動から主要画面表示まで2分以内、接続エラー時の通知10秒以内、接続先変更からLLM操作完了まで1分以内  
**Constraints**: LLM接続先はHTTP/HTTPSのみ、任意パス/ポート/localhost可。通信エラー時もアプリ利用を継続可能にする  
**Scale/Scope**: 単一ローカルユーザー向けの設定、主要フロー2件（Windowsビルド/LLM接続先設定）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- constitution.md はテンプレートのプレースホルダのみで、適用可能な明示ルールが定義されていない
- Gate判定: **PASS（適用可能な制約なし）**
- Phase 1再評価: **PASS（追加の制約なし）**

## Project Structure

### Documentation (this feature)

```text
specs/003-windows-build-llm-http/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
packages/
├── main/        # Electron main process
├── preload/     # contextBridge API
├── renderer/    # UI (index.html, src/main.ts)
├── core/        # domain logic (FlowStore, StateDB, ProcessManager, approval)
└── shared/      # shared types, IPC contracts, errors
```

**Structure Decision**: 既存のpackages構成に従い、UIは `packages/renderer`、設定保存とドメインは `packages/core`、IPC/起動は `packages/main` と `packages/preload`、共有型は `packages/shared` に配置する。
