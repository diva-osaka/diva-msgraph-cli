# d-msgraph-cli 実装計画

## Context

Office 365のメール・カレンダーをCLIから操作するツールを新規開発する。Microsoft Graph APIを使用し、Windows/Linux/Macのクロスプラットフォームで動作させる。プロジェクトは現在空の状態（.gitignoreのみ）。

**CLIコマンド名:** `d-msgraph`

**主な機能:**
- メール取得（時間指定: last60min, last6hours, yesterday / 件数指定: last N件）
- メール送信
- カレンダー取得（日付範囲指定）
- カレンダー追加・編集
- 認証管理（ログイン/ログアウト/状態確認）
- 認証フロー: Device Code Flow（対話的）+ Client Credentials Flow（自動化用）の両方
- タイムゾーン: OSのシステムタイムゾーンを自動検出（`Intl.DateTimeFormat().resolvedOptions().timeZone`）
- 開発: 5人のエージェントチームで並行開発

## 技術スタック

| 項目 | 選定 | 理由 |
|------|------|------|
| ランタイム | Node.js 18+ / TypeScript | クロスプラットフォーム、型安全 |
| CLIフレームワーク | Commander.js | 軽量、サブコマンド対応、広く使われている |
| 認証 | @azure/msal-node | Device Code Flow（対話的）+ Client Credentials Flow（自動化用） |
| Graph API | @microsoft/microsoft-graph-client | 公式SDK |
| テスト | vitest | 高速、TypeScriptネイティブ |
| 出力整形 | chalk + cli-table3 + ora | 色付き、テーブル表示、スピナー |

## ディレクトリ構成

```
d-msgraph-cli/
├── src/
│   ├── index.ts                  # CLIエントリポイント
│   ├── commands/
│   │   ├── auth.ts               # auth login / logout / status
│   │   ├── mail.ts               # mail list / read / send
│   │   └── calendar.ts           # calendar list / get / add / edit
│   ├── services/
│   │   ├── auth.ts               # MSAL認証サービス
│   │   ├── graph-client.ts       # Graphクライアント生成
│   │   ├── mail.ts               # メールAPI操作
│   │   └── calendar.ts           # カレンダーAPI操作
│   ├── utils/
│   │   ├── config.ts             # 設定管理（~/.d-msgraph-cli/）
│   │   ├── format.ts             # 出力フォーマット
│   │   ├── date.ts               # 日時パースユーティリティ
│   │   └── errors.ts             # エラーハンドリング
│   └── types/
│       └── index.ts              # 型定義
├── tests/
│   ├── services/
│   │   ├── auth.test.ts
│   │   ├── mail.test.ts
│   │   └── calendar.test.ts
│   └── utils/
│       ├── date.test.ts
│       └── format.test.ts
├── docs/
│   └── setup-guide.md            # Entra IDセットアップガイド
├── package.json
├── tsconfig.json
├── vitest.config.ts
├── .env.example
├── .eslintrc.json
├── .prettierrc
├── CLAUDE.md
└── README.md
```

## 実装フェーズ

### Phase 1: プロジェクトセットアップ

**作成ファイル:** `package.json`, `tsconfig.json`, `.eslintrc.json`, `.prettierrc`, `.env.example`, `CLAUDE.md`, `src/index.ts`, `src/types/index.ts`

- `npm init` + 依存パッケージインストール
  - 本番: `commander`, `@azure/msal-node`, `@microsoft/microsoft-graph-client`, `chalk`, `ora`, `cli-table3`, `dotenv`, `isomorphic-fetch`
  - 開発: `typescript`, `@types/node`, `vitest`, `eslint`, `@typescript-eslint/*`, `prettier`, `tsx`, `rimraf`
- TypeScript設定: `target: ES2020`, `module: commonjs`, `strict: true`
- `src/index.ts`にCommander.jsのスケルトン作成
- 型定義ファイル（`src/types/index.ts`）に全インターフェース定義

**検証:** `npx tsx src/index.ts --help` でヘルプ表示

---

### Phase 2: 認証モジュール

**作成ファイル:** `src/services/auth.ts`, `src/services/graph-client.ts`, `src/utils/config.ts`, `src/utils/errors.ts`, `src/commands/auth.ts`

**認証フロー:**
- **Device Code Flow（メイン）:** ユーザーがブラウザで認証。`PublicClientApplication`使用
- **Client Credentials Flow（自動化用）:** クライアントシークレットで認証。`ConfidentialClientApplication`使用
- **トークンキャッシュ:** MSALの`ICachePlugin`インターフェースで`~/.d-msgraph-cli/token-cache.json`に永続化
- **サイレントトークン取得:** `acquireTokenSilent`で自動更新。失敗時は再ログイン促す

**設定管理 (`src/utils/config.ts`):**
- 設定ディレクトリ: `~/.d-msgraph-cli/`（`os.homedir()`でクロスプラットフォーム対応）
- 優先順位: CLIフラグ > 環境変数(.env) > 設定ファイル(config.json)

**コマンド:**
```bash
d-msgraph auth login              # Device Code Flowでログイン
d-msgraph auth login --client-credentials  # Client Credentialsでログイン
d-msgraph auth logout             # トークンキャッシュ削除
d-msgraph auth status             # 認証状態表示
```

**検証:** `auth login` → ブラウザ認証 → `auth status` でログイン確認

---

### Phase 3: メールコマンド

**作成ファイル:** `src/services/mail.ts`, `src/commands/mail.ts`, `src/utils/date.ts`, `src/utils/format.ts`

**Graph APIパターン:**
- メール一覧: `GET /me/messages?$filter=receivedDateTime ge {datetime}&$top={count}&$orderby=receivedDateTime desc&$select=id,subject,from,...`
- メール詳細: `GET /me/messages/{id}`
- メール送信: `POST /me/sendMail` with `{ message: { subject, body, toRecipients } }`

**日時パース (`src/utils/date.ts`):**
- `last60min` → 60分前のISO文字列
- `last6hours` → 6時間前
- `yesterday` → 昨日0:00〜23:59:59
- `today` → 今日0:00〜現在
- `last7days` → 7日前〜現在
- ISO文字列 → そのまま使用

**コマンド:**
```bash
d-msgraph mail list                       # 直近25件
d-msgraph mail list -n 10                 # 直近10件
d-msgraph mail list --since last60min     # 直近1時間のメール
d-msgraph mail list --since yesterday     # 昨日のメール
d-msgraph mail list --format json         # JSON出力
d-msgraph mail read <messageId>           # メール本文表示
d-msgraph mail send -t user@example.com -s "件名" -b "本文"
```

**検証:** 各コマンドの実行と出力確認

---

### Phase 4: カレンダーコマンド

**作成ファイル:** `src/services/calendar.ts`, `src/commands/calendar.ts`

**Graph APIパターン:**
- イベント一覧: `GET /me/calendarView?startDateTime={start}&endDateTime={end}` （定期的なイベントも展開される）
- イベント詳細: `GET /me/events/{id}`
- イベント作成: `POST /me/events`
- イベント更新: `PATCH /me/events/{id}`（変更フィールドのみ送信）

**注意:** `/me/calendarView` は `startDateTime`/`endDateTime` をクエリパラメータで指定（$filterではない）。定期イベントを個別のオカレンスとして展開するため、日付範囲クエリに最適。

**タイムゾーン:** OSのシステムタイムゾーンを自動検出（`Intl.DateTimeFormat().resolvedOptions().timeZone`）。`Prefer: outlook.timezone` ヘッダーで指定。`--timezone` フラグでオーバーライド可能。

**コマンド:**
```bash
d-msgraph calendar list                                      # 今日から7日間
d-msgraph calendar list --start 2024-03-01 --end 2024-03-31  # 3月のイベント
d-msgraph calendar list --format json                        # JSON出力
d-msgraph calendar get <eventId>                             # イベント詳細
d-msgraph calendar add -s "会議" --start "2024-03-15 14:00" --end "2024-03-15 15:00"
d-msgraph calendar add -s "休暇" --start "2024-03-20" --end "2024-03-21" --all-day
d-msgraph calendar edit <eventId> -s "件名変更" --start "2024-03-15 15:00"
```

**検証:** 各コマンドの実行と出力確認

---

### Phase 5: ドキュメント・仕上げ

**作成ファイル:** `docs/setup-guide.md`, `README.md`

**Entra IDセットアップガイド（`docs/setup-guide.md`）:**
1. Azure Portal → Microsoft Entra ID → アプリの登録 → 新規登録
2. アプリ名設定、サポートされるアカウントの種類を選択
3. Application (client) ID と Directory (tenant) ID を記録
4. APIのアクセス許可追加: `User.Read`, `Mail.Read`, `Mail.Send`, `Calendars.ReadWrite`
5. 管理者の同意を付与
6. 認証 → パブリッククライアントフローを許可 → 「はい」
7. （オプション）クライアントシークレット作成
8. `.env` ファイルに `AZURE_CLIENT_ID` と `AZURE_TENANT_ID` を設定

**エラーハンドリング改善:**
- Graph APIエラーコードをユーザーフレンドリーなメッセージにマッピング
- `--verbose` グローバルフラグでスタックトレース表示

---

### Phase 6: テスト・レビュー

**作成ファイル:** `vitest.config.ts`, `tests/` 配下の全テストファイル

**テスト方針:**
- Graphクライアントをモック化してUnit Test
- `vi.useFakeTimers()` で日時依存テストを安定化
- services/ と utils/ を中心にテスト

**セキュリティチェック項目:**
- トークンキャッシュのファイルパーミッション
- ハードコードされた秘密情報がないこと
- クライアントシークレットがログ/表示されないこと
- 入力値のバリデーション（メールアドレス、イベントID）
- HTTPS通信のみ
- エラーメッセージにトークンが漏洩しないこと
- `npm audit` で脆弱性確認
- `.env` が .gitignore に含まれていること

**パフォーマンスチェック項目:**
- `$select` で必要フィールドのみ取得
- トークンキャッシュによるサイレント取得
- 不要な依存パッケージがないこと
- CLI起動速度

## フェーズ依存関係

```
Phase 1 (セットアップ)
   ↓
Phase 2 (認証)
   ↓
Phase 3 (メール) ←→ Phase 4 (カレンダー)  ※並行可能
   ↓
Phase 5 (ドキュメント)
   ↓
Phase 6 (テスト・レビュー)
```

## エージェントチーム構成

| エージェント | 担当フェーズ | 役割 |
|---|---|---|
| **Leader** | 全体 | タスク管理・進捗管理・レビュー・最終統合 |
| **Developer** | Phase 1〜5 | 全実装作業。Phase 3と4は独立のため並行実装可能 |
| **Tester** | Phase 6 | Phase 2完了後にテスト開始。認証→メール→カレンダーの順 |
| **Security Checker** | Phase 6 | Phase 4完了後に全コードのセキュリティレビュー |
| **Performance Checker** | Phase 6 | Phase 4完了後にAPIパターン・キャッシュ・起動速度レビュー |

## End-to-End 検証手順

1. `npm install` → `npm run build` が成功すること
2. `npx tsx src/index.ts --help` で全コマンドが表示されること
3. Entra IDアプリを登録し、`.env` に設定
4. `d-msgraph auth login` → Device Code Flowでブラウザ認証
5. `d-msgraph auth status` → ログイン状態確認
6. `d-msgraph mail list --since last6hours` → メール一覧取得
7. `d-msgraph mail list --format json` → JSON出力確認
8. `d-msgraph calendar list` → 今週のカレンダー取得
9. `d-msgraph calendar add -s "テスト" --start "..." --end "..."` → イベント作成
10. `d-msgraph auth logout` → ログアウト確認
11. `npm test` → 全テスト通過
12. `npm run lint && npx tsc --noEmit` → エラーなし
