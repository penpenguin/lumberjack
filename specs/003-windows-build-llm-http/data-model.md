# Data Model: Windows実行可能ビルドとLLM HTTP接続設定

## Entity: LLM接続設定

**Purpose**: LLMへの接続先をユーザーが指定し、再起動後も同じ接続先で利用できるようにする。

### Fields

- **endpointUrl**: string (必須)
  - HTTP/HTTPSのみ
  - 任意のパス・ポート・クエリを許容
  - localhost/127.0.0.1 等のローカルアドレスを許容
- **updatedAt**: datetime (必須)
- **validationStatus**: enum (optional) = valid | invalid | unchecked
- **lastErrorMessage**: string (optional)

### Relationships

- 単一ローカルユーザー（暗黙のプロファイル）に1件紐づく

### Validation Rules

- endpointUrl は空文字不可
- endpointUrl は http または https スキームのみ許可
- endpointUrl は有効なURL形式であること

### State Transitions (if applicable)

- unchecked → valid (保存時検証が成功)
- unchecked → invalid (保存時検証が失敗)
- valid → invalid (保存後の再検証で不正と判定された場合)
