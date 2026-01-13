# Research: Windows実行可能ビルドとLLM HTTP接続設定

## Decision 1: Windows配布ビルドは既存のビルド/パッケージ手順を拡張して対応する

- **Decision**: 既存のElectronアプリ向けビルド手順を前提に、Windows配布物（実行可能ファイル/インストーラ）を生成できるようにする
- **Rationale**: 既存のビルド環境と運用がある前提のため、新規ツール導入より既存フローへの追加が最短でリスクが低い
- **Alternatives considered**: Windows専用の新規ビルドパイプラインを別途構築する

## Decision 2: LLM接続先は単一URLとして保存・再利用する

- **Decision**: ユーザーが指定したHTTP/HTTPSの完全URL（パス・ポート含む）を単一の設定値として永続化し、すべてのLLM操作で使用する
- **Rationale**: 「任意のパスを指定できる」要件を満たしつつ、UI/保存/検証の複雑さを最小化できる
- **Alternatives considered**: ホスト/ポート/パスを個別設定として分割し、組み立てる

## Decision 3: URL検証は標準的なURL形式チェックに限定する

- **Decision**: 保存前にHTTP/HTTPSスキーム必須、URL形式妥当性、localhost/127.0.0.1/任意パス許容を確認する
- **Rationale**: 要件は「HTTP経由」と「任意のパス」なので、過剰な制限は利用性を下げる
- **Alternatives considered**: 特定ドメインやパス形式をホワイトリスト化する

## Decision 4: 接続エラーはユーザー通知のみでフローを継続する

- **Decision**: LLM接続の失敗は明確なメッセージで通知し、アプリの他機能は継続利用可能とする
- **Rationale**: 仕様の「アプリの利用を妨げない」要件に一致し、再試行や設定変更の余地を残す
- **Alternatives considered**: エラー時にアプリ全体を停止する、設定を自動で巻き戻す
