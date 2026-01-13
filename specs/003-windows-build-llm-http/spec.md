# Feature Specification: Windows実行可能ビルドとLLM HTTP接続設定

**Feature Branch**: `003-windows-build-llm-http`  
**Created**: 2026-01-13  
**Status**: Draft  
**Input**: User description: "Windwosでの実行可能ビルドを作れるように。 また、LLMへのアクセスはHTTP経由で、任意のパスを指定できるように (localhost)含む"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Windows向け配布ビルドを作成する (Priority: P1)

リリース担当者として、Windowsユーザーへ配布できる実行可能ビルドを作成したい。そうすることで、Windows環境でもアプリを利用できる。

**Why this priority**: 主要な利用環境であるWindowsに配布できないとユーザーが利用できず、事業価値が成立しないため。

**Independent Test**: リリース手順だけでWindows向け配布物が生成され、Windows環境で起動できることを確認できる。

**Acceptance Scenarios**:

1. **Given** リリース対象のソースが揃っている, **When** 配布ビルドを作成する, **Then** Windows向け配布物（実行可能ファイルまたはインストーラ）が生成される
2. **Given** 生成されたWindows配布物, **When** サポート対象のWindows環境で起動する, **Then** アプリが起動して主要画面が表示される

---

### User Story 2 - LLMの接続先をHTTPで指定する (Priority: P2)

利用者として、LLMの接続先URLをHTTP経由で自由に指定したい。これにより、社内サーバーやローカルLLM（localhostを含む）に接続できる。

**Why this priority**: 利用環境によって接続先が異なるため、固定の接続先では利用できないケースがある。

**Independent Test**: 設定画面でURLを変更し、そのURLに対してLLM操作が実行されることを確認できる。

**Acceptance Scenarios**:

1. **Given** 設定画面が表示されている, **When** 有効なHTTP/HTTPS URL（任意のパス・ポート・localhostを含む）を入力して保存する, **Then** 設定が保存され以後のLLM操作はそのURLに送信される
2. **Given** 無効なURL（スキーム欠落や非対応スキームなど）, **When** 保存を試みる, **Then** 入力エラーが分かるメッセージが表示され設定は適用されない
3. **Given** 接続先が到達不能または応答不能, **When** LLM操作を実行する, **Then** エラーがユーザーに通知されアプリは継続利用できる

### Edge Cases

- URLに末尾スラッシュやクエリ文字列が含まれる場合でも正しく扱えるか？
- localhost / 127.0.0.1 などローカルアドレスを指定した場合の挙動
- LLM接続先がエラー応答や不正なレスポンスを返す場合の扱い

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST Windows向けの配布可能な実行ビルドを生成できる
- **FR-002**: System MUST サポート対象のWindows環境で配布物が起動できる
- **FR-003**: Users MUST LLM接続先をHTTP/HTTPS URLとして、任意のパス・ポート・localhostを含めて指定できる
- **FR-004**: System MUST すべてのLLM操作を、設定された接続先URLに送信する
- **FR-005**: System MUST URLの形式と対応スキームを保存前に検証し、無効な入力には分かるエラーメッセージを表示する
- **FR-006**: System MUST LLM接続先の通信エラーや応答エラーをユーザーに通知し、アプリの利用を妨げない
- **FR-007**: System MUST 設定されたLLM接続先をユーザー単位で再起動後も保持する

### Key Entities *(include if feature involves data)*

- **LLM接続設定**: 接続先URL、最終更新日時、検証結果

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Windows 10/11 の検証環境で、配布物の起動から主要画面表示までが2分以内に完了する
- **SC-002**: ユーザーがLLM接続先を変更し、1分以内に新しい接続先でLLM操作を完了できる（3回連続）
- **SC-003**: 検証シナリオ内のLLM操作が、100% 設定済みURLに送信される
- **SC-004**: 接続エラー時に10秒以内でエラーメッセージが表示され、アプリの他機能は継続利用できる

## Assumptions

- サポート対象のWindowsは Windows 10 / 11（64-bit）とする
- LLM接続先はHTTP/HTTPSで提供され、追加の認証要件は本スコープ外とする
- LLM接続先の設定はローカルに保存され、同一ユーザーで再利用される

## Dependencies

- Windows向け配布に必要なビルド環境と配布手順が既存運用で用意されている
- 既存のLLM操作がHTTPベースの接続先変更に対応できる前提がある
