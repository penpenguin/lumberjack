# Phase 0 Research: 非英語文字表示対応

## Decision 1: 共通フォントフォールバックを明示的に適用する

- **Decision**: renderer のルート (body/app コンテナ) でフォントスタックを明示し、全表示領域に継承させる
- **Rationale**: 部分的な指定だと漏れが起きやすく、豆腐が再発するため
- **Alternatives considered**: 個別コンポーネントへの局所修正 (漏れ・保守コストが高い)

## Decision 2: フォントの供給を OS 任せにせず、必要なら同梱する

- **Decision**: 既定 OS フォントで不足が出る場合に備え、カバレッジの広いフォントを同梱する方針とする
- **Rationale**: OS 依存だと非英語文字の表示が不安定で、再現性のある品質保証が難しいため
- **Alternatives considered**: OS 既定フォントのみに依存 (環境差で豆腐が再発)

## Decision 3: 表示対象を「すべての UI 表示領域」に固定する

- **Decision**: 入力、出力、履歴、設定、ダイアログなど UI 全面を対象とする
- **Rationale**: 1 か所でも豆腐が残ると UX が破綻するため
- **Alternatives considered**: 主要画面のみ対象 (サブ画面で再発)

## Decision 4: 検証用テキストセットを用意して確認する

- **Decision**: 日本語・CJK・アラビア語・キリル・アクセント付きラテン・絵文字の代表テキストで表示確認を行う
- **Rationale**: 一般的に豆腐が発生しやすい文字体系を網羅できるため
- **Alternatives considered**: 手元の任意テキストのみで確認 (網羅性が低い)

## Evaluation Result: OS 依存フォントの確認 (2026-01-08)

- **Observation**: 開発環境のフォント一覧に CJK 系フォントが見当たらず、代表テキストの表示は OS 依存では不足する可能性が高い
- **Decision**: フォント同梱を必要と判断し、同梱前提で実装を進める
