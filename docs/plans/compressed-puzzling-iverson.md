# 共有カレンダー対応

## Context
カレンダー操作（list, get, add, edit）が現在デフォルトカレンダー（me）のみ対応。
共有カレンダー（例: "ディーバ"）も指定して使えるようにする。
また、カレンダー一覧を確認するためのコマンドも追加する。

## 変更ファイル

### 1. `src/types/index.ts` — CalendarInfo 型を追加
```typescript
export interface CalendarInfo {
  id: string;
  name: string;
  owner?: { name: string; address: string };
  isDefaultCalendar?: boolean;
  canEdit?: boolean;
}
```

### 2. `src/services/calendar.ts` — 2メソッド追加 + 既存メソッド変更

**追加:**
- `listCalendars()`: `GET /me/calendars` でカレンダー一覧を取得
- `resolveCalendarId(name: string)`: カレンダー名からIDを解決。名前部分一致で検索し、一意に特定できなければエラー

**変更:**
- `listEvents()`: オプション引数 `calendarId?` を追加。指定時は `/me/calendars/{id}/calendarView` を使用
- `createEvent()`: オプション引数 `calendarId?` を追加。指定時は `/me/calendars/{id}/events` を使用
- `getEvent()`, `updateEvent()`: イベントIDはカレンダー横断でユニークなので変更不要

### 3. `src/commands/calendar.ts` — サブコマンド追加 + オプション追加

**追加:**
- `calendar calendars` サブコマンド: カレンダー一覧をテーブル/JSON表示

**変更:**
- `calendar list`, `calendar add` に `--calendar <name>` オプション追加
  - 未指定 → デフォルトカレンダー（現在の動作）
  - 指定時 → `resolveCalendarId()` で名前からID解決して使用
- `calendar get`, `calendar edit` は変更不要（イベントIDで一意に特定可能）

### 4. `README.md` — 使い方に共有カレンダーの説明追加

## スコープについて
Microsoft Graph v1.0 の委任されたアクセス許可では、`Calendars.ReadWrite` で共有カレンダーへのアクセスも可能（`.Shared` サフィックスは不要）。ただし動作確認後、必要であれば `Calendars.Read.Shared` をデフォルトスコープに追加検討。

## 検証方法
1. `npm run build`
2. `d-msgraph calendar calendars` でカレンダー一覧が表示されるか確認
3. `d-msgraph calendar list --calendar "ディーバ"` で共有カレンダーの予定が取得できるか確認
4. `d-msgraph calendar add --calendar "ディーバ" -s "テスト" --start ... --end ...` で共有カレンダーに予定作成できるか確認
5. 未指定時は従来通りデフォルトカレンダーが使われるか確認
