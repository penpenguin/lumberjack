---

description: "Task list template for feature implementation"
---

# Tasks: 非英語文字表示対応

**Input**: Design documents from `/specs/002-fix-nonlatin-fonts/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: 本プロジェクトは t-wada TDD を必須とするため、テストタスクを含める。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Renderer (UI)**: `packages/renderer/src/`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 グローバルスタイル用のファイルを作成する(packages/renderer/src/styles/global.css)
- [x] T002 フォント定義用のファイルを作成する(packages/renderer/src/styles/fonts.css)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 グローバルCSSとフォントCSSの読み込みを検証するテストを追加する(packages/renderer/src/styles/global.test.ts)
- [x] T004 main エントリで global.css と fonts.css を読み込む(packages/renderer/src/main.tsx)
- [x] T005 代表テキストで OS 依存の豆腐発生を評価し、結果を記録する(specs/002-fix-nonlatin-fonts/research.md)
- [x] T006 評価結果で同梱が必要な場合にフォント資産を追加する(packages/renderer/src/assets/fonts/)
- [x] T007 評価結果で同梱が必要な場合に @font-face を定義する(packages/renderer/src/styles/fonts.css)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - 非英語テキストの閲覧 (Priority: P1) 🎯 MVP

**Goal**: 画面表示の非英語テキストが豆腐にならない

**Independent Test**: 翻訳結果に非英語が含まれる状態で表示し、豆腐が発生しないことを確認する

### Tests for User Story 1 (TDD)

- [x] T008 [US1] 基本フォントスタックの定義を検証するテストを追加する(packages/renderer/src/styles/global.test.ts)
- [x] T009 [US1] コピー時に文字が欠落しないことを検証するテストを追加する(packages/renderer/src/features/translation/TranslationView.test.tsx)

### Implementation for User Story 1

- [x] T010 [US1] ルートに適用するフォントスタックを追加する(packages/renderer/src/styles/global.css)
- [x] T011 [US1] コピー&ペーストの確認手順を追加する(specs/002-fix-nonlatin-fonts/quickstart.md)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - 非英語入力の編集 (Priority: P2)

**Goal**: 入力欄で非英語テキストが読める

**Independent Test**: テキストエリア/入力欄に非英語を入力・貼り付けし、豆腐にならないことを確認する

### Tests for User Story 2 (TDD)

- [x] T012 [US2] 入力系フォーム要素がフォント継承することを検証するテストを追加する(packages/renderer/src/styles/global.test.ts)

### Implementation for User Story 2

- [x] T013 [US2] input/textarea/select のフォント継承ルールを追加する(packages/renderer/src/styles/global.css)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - 履歴・一覧での表示 (Priority: P3)

**Goal**: 履歴/一覧でも非英語テキストが読める

**Independent Test**: 履歴一覧と詳細で非英語テキストが豆腐にならないことを確認する

### Tests for User Story 3 (TDD)

- [x] T014 [US3] ボタン要素がフォント継承することを検証するテストを追加する(packages/renderer/src/styles/global.test.ts)

### Implementation for User Story 3

- [x] T015 [US3] button のフォント継承ルールを追加する(packages/renderer/src/styles/global.css)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T016 クイックスタート手順で手動確認を行う(specs/002-fix-nonlatin-fonts/quickstart.md)
- [x] T017 フォントライセンスを同梱する(packages/renderer/src/assets/fonts/OFL.txt)
- [x] T018 サードパーティ通知を追加する(THIRD_PARTY_NOTICES.md)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3)
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories

### Within Each User Story

- Tests MUST be written and FAIL before implementation
- CSS rule tests before CSS changes

### Parallel Opportunities

- ストーリー実装は Phase 2 完了後に並行開始可能
- 同一ファイル編集は競合するため並行は避ける

---

## Parallel Example: User Story 1

```bash
# Parallel tasks: なし(同一ファイルのため直列で実施)
```

---

## Parallel Example: User Story 2

```bash
# Parallel tasks: なし(同一ファイルのため直列で実施)
```

---

## Parallel Example: User Story 3

```bash
# Parallel tasks: なし(同一ファイルのため直列で実施)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Demo (MVP)
3. Add User Story 2 → Test independently → Demo
4. Add User Story 3 → Test independently → Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1
   - Developer B: User Story 2
   - Developer C: User Story 3
3. Stories complete and integrate independently

---

## Notes

- [P] tasks = different files, no dependencies
- Each user story should be independently completable and testable
- TDD: テスト → 失敗 → 実装 → リファクタ
- コミットは小さく段階的に
