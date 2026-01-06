# Project Overview

- Name: lumberjack (current repo name; user requested rename to Nativox Translate)
- Purpose: ローカル完結のSDLCフロー実行/可視化ツール (Electron + WSLg前提)
- Tech stack: TypeScript (ESM), Electron + Vite (electron-vite), React, Vitest + jsdom, ESLint + Prettier
- High-level structure:
  - packages/main: Electron main process (IPC, app lifecycle)
  - packages/preload: contextBridge API for renderer
  - packages/renderer: UI entry (index.html, src/main.ts)
  - packages/core: domain logic (FlowStore, StateDB, ProcessManager, approval)
  - packages/shared: shared types, IPC contracts, errors
  - Specs: .kiro/specs/

Sources: README.md, AGENTS.md