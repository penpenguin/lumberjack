---

description: "Task list for Windows実行可能ビルドとLLM HTTP接続設定"
---

# Tasks: Windows実行可能ビルドとLLM HTTP接続設定

**Input**: Design documents from `/home/user/repository/nativox-translate/specs/003-windows-build-llm-http/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Tests**: TDD必須（各ストーリーでテストを先に作成し、失敗→実装→リファクタ）

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 全体で共有する型・設定の土台を用意する

- [x] T001 Update LLM endpoint fields in `/home/user/repository/nativox-translate/packages/shared/src/translation/types.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 共有の検証・永続化基盤（全ストーリーの前提）

- [x] T002 [P] Add failing URL validation tests in `/home/user/repository/nativox-translate/packages/core/src/translation/endpointValidation.test.ts`
- [x] T003 [P] Add failing settings repository tests in `/home/user/repository/nativox-translate/packages/core/src/translation/settingsRepository.test.ts`
- [x] T004 [P] Add failing settings service tests for endpointUrl behavior in `/home/user/repository/nativox-translate/packages/core/src/translation/settingsService.test.ts`
- [x] T005 Implement URL validation utility in `/home/user/repository/nativox-translate/packages/core/src/translation/endpointValidation.ts`
- [x] T006 Implement settings repository for persistent storage in `/home/user/repository/nativox-translate/packages/core/src/translation/settingsRepository.ts`
- [x] T007 Update settings service to validate and persist endpointUrl in `/home/user/repository/nativox-translate/packages/core/src/translation/settingsService.ts`
- [x] T008 Export new translation modules in `/home/user/repository/nativox-translate/packages/core/src/translation/index.ts`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Windows向け配布ビルドを作成する (Priority: P1) 🎯 MVP

**Goal**: Windows向けの実行可能ビルドを作成できる状態にする

**Independent Test**: `build:win` 実行でWindows配布物が生成され、起動できる

### Tests for User Story 1

- [x] T009 [P] [US1] Add failing test for Windows build config in `/home/user/repository/nativox-translate/packages/main/src/electronViteConfig.test.ts`

### Implementation for User Story 1

- [x] T010 [US1] Add Windows packaging config in `/home/user/repository/nativox-translate/electron-builder.yml`
- [x] T011 [US1] Add Windows build script/dependency in `/home/user/repository/nativox-translate/package.json` and `/home/user/repository/nativox-translate/package-lock.json`
- [x] T012 [US1] Document Windows build command in `/home/user/repository/nativox-translate/README.md`

**Checkpoint**: Windows配布ビルドが生成できる

---

## Phase 4: User Story 2 - LLMの接続先をHTTPで指定する (Priority: P2)

**Goal**: HTTP/HTTPSの任意URL（localhost含む）をLLM接続先として保存・利用できる

**Independent Test**: 設定画面でURLを保存し、翻訳がそのURLへ送信される

### Tests for User Story 2

- [x] T013 [P] [US2] Add failing tests for HTTP executor in `/home/user/repository/nativox-translate/packages/main/src/translation/agentHttpExec.test.ts`
- [x] T014 [P] [US2] Add failing tests for HTTP error mapping in `/home/user/repository/nativox-translate/packages/core/src/translation/errors.test.ts`
- [x] T015 [P] [US2] Add failing settings persistence tests in `/home/user/repository/nativox-translate/packages/main/src/mainApp.test.ts`
- [x] T016 [P] [US2] Add failing UI tests for endpoint URL field in `/home/user/repository/nativox-translate/packages/renderer/src/features/translation/SettingsView.test.tsx`

### Implementation for User Story 2

- [x] T017 [US2] Implement HTTP agent executor in `/home/user/repository/nativox-translate/packages/main/src/translation/agentHttpExec.ts`
- [x] T018 [US2] Wire HTTP executor selection and settings load/save in `/home/user/repository/nativox-translate/packages/main/src/mainApp.ts`
- [x] T019 [US2] Extend IPC handlers to return/update endpointUrl in `/home/user/repository/nativox-translate/packages/main/src/translation/ipcHandlers.ts`
- [x] T020 [US2] Update preload bridge types if needed in `/home/user/repository/nativox-translate/packages/preload/src/translation.ts`
- [x] T021 [US2] Update renderer API usage if needed in `/home/user/repository/nativox-translate/packages/renderer/src/features/translation/api.ts`
- [x] T022 [US2] Add endpoint URL field + validation UI in `/home/user/repository/nativox-translate/packages/renderer/src/features/translation/SettingsView.tsx`
- [x] T023 [US2] Extend error mapping for HTTP failures in `/home/user/repository/nativox-translate/packages/core/src/translation/errors.ts`

**Checkpoint**: endpoint URLが保存・反映され、HTTP経由でLLMが呼び出せる

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: 横断的な改善と検証

- [x] T024 [P] Run quickstart validation steps in `/home/user/repository/nativox-translate/specs/003-windows-build-llm-http/quickstart.md`
- [x] T025 [P] Update docs for endpoint URL examples in `/home/user/repository/nativox-translate/specs/003-windows-build-llm-http/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion
- **User Story 1 (Phase 3)**: Depends on Foundational completion
- **User Story 2 (Phase 4)**: Depends on Foundational completion
- **Polish (Phase 5)**: Depends on desired user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational (Phase 2)
- **US2 (P2)**: Can start after Foundational (Phase 2)

### Parallel Opportunities

- Phase 2 tests (T002–T004) can run in parallel
- Phase 4 tests (T013–T016) can run in parallel
- Phase 4 UI vs main-process tasks (T017–T022) can be split by team

---

## Parallel Example: User Story 2

```bash
Task: "Add failing tests for HTTP executor in /home/user/repository/nativox-translate/packages/main/src/translation/agentHttpExec.test.ts"
Task: "Add failing tests for HTTP error mapping in /home/user/repository/nativox-translate/packages/core/src/translation/errors.test.ts"
Task: "Add failing UI tests for endpoint URL field in /home/user/repository/nativox-translate/packages/renderer/src/features/translation/SettingsView.test.tsx"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 → Phase 2
2. Implement Phase 3 (US1)
3. Validate Windows build output

### Incremental Delivery

1. Foundation ready → US1
2. US1 validated → US2
3. US2 validated → Polish

### Parallel Team Strategy

- Developer A: US1 tasks (T009–T012)
- Developer B: US2 backend/main tasks (T013–T019, T023)
- Developer C: US2 UI tasks (T016, T022)
