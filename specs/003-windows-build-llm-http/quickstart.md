# Quickstart: Windows実行可能ビルドとLLM HTTP接続設定

## Prerequisites

- Node.js と依存関係がインストール済み
- Windows 10/11 環境（配布ビルドの動作確認用）

## Run in development

1. 依存関係のインストール
   ```bash
   npm install
   ```
2. 開発モード起動
   ```bash
   npm run dev
   ```

## Configure LLM endpoint

1. アプリの設定画面を開く
2. 例: `http://localhost:11434/v1/chat` や `https://example.com/api/translate` のようなHTTP/HTTPS URLを入力して保存
3. LLM操作を実行し、設定済みURLに送信されることを確認

## Build

1. 本番ビルド
   ```bash
   npm run build
   ```
2. 生成されたWindows向け配布物をWindows環境で起動し、主要画面が表示されることを確認

## Tests

```bash
npm run test
```
