# d-msgraph-cli

Microsoft Graph API を利用して、メールとカレンダーの操作をコマンドラインから行うための CLI ツールです。

## 機能一覧

- **認証**: デバイスコードフローおよび Client Credentials フローによる Microsoft Graph 認証
- **メール**: メール一覧表示、本文の読み取り、メール送信
- **カレンダー**: 予定の一覧表示、詳細表示、予定の作成・編集

## インストール

```bash
# グローバルインストール
npm install -g d-msgraph-cli

# または npx で直接実行
npx d-msgraph-cli <command>
```

## セットアップ

### 1. Microsoft Entra ID のアプリ登録

Azure Portal でアプリケーションを登録し、必要な API アクセス許可を設定します。

詳細な手順は [Entra ID セットアップガイド](docs/setup-guide.md) を参照してください。

### 2. 環境変数の設定

プロジェクトルートに `.env` ファイルを作成します。

```bash
AZURE_CLIENT_ID=your-client-id
AZURE_TENANT_ID=your-tenant-id

# Client Credentials フロー使用時のみ
AZURE_CLIENT_SECRET=your-client-secret
```

## 使い方

### 認証

```bash
# デバイスコードフローでログイン
d-msgraph auth login

# Client Credentials フローでログイン
d-msgraph auth login --client-credentials

# ログアウト
d-msgraph auth logout

# 認証状態の確認
d-msgraph auth status
```

### メール

```bash
# メール一覧を表示（デフォルト: 最新25件）
d-msgraph mail list

# 直近60分のメールを表示
d-msgraph mail list --since last60min

# 件数を指定して表示
d-msgraph mail list -n 10

# JSON形式で出力
d-msgraph mail list --format json

# メールの詳細を表示
d-msgraph mail read <messageId>

# メールを送信
d-msgraph mail send -t user@example.com -s "件名" -b "本文"

# 複数の宛先にHTML形式で送信
d-msgraph mail send -t "user1@example.com,user2@example.com" -s "件名" -b "<h1>本文</h1>" --html
```

### カレンダー

```bash
# 今後7日間の予定を表示
d-msgraph calendar list

# 期間を指定して表示
d-msgraph calendar list --start 2024-03-01 --end 2024-03-31

# JSON形式で出力
d-msgraph calendar list --format json

# 予定の詳細を表示
d-msgraph calendar get <eventId>

# 予定を作成
d-msgraph calendar add -s "会議" --start "2024-03-15T10:00:00" --end "2024-03-15T11:00:00"

# 場所と参加者を指定して予定を作成
d-msgraph calendar add -s "チームミーティング" \
  --start "2024-03-15T10:00:00" \
  --end "2024-03-15T11:00:00" \
  --location "会議室A" \
  --attendees "user1@example.com,user2@example.com" \
  --online

# 予定を編集
d-msgraph calendar edit <eventId> -s "新しい件名"

# 予定の日時を変更
d-msgraph calendar edit <eventId> --start "2024-03-15T14:00:00" --end "2024-03-15T15:00:00"
```

### 共通オプション

```bash
# 詳細出力を有効にする
d-msgraph --verbose <command>

# バージョン表示
d-msgraph --version

# ヘルプ表示
d-msgraph --help
d-msgraph <command> --help
```

## 開発

```bash
# 開発モードで実行
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# Lint
npm run lint
```

## ライセンス

ISC
