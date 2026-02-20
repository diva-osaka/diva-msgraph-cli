---
name: d-msgraph
description: "Microsoft Graph CLI (d-msgraph) to read emails and manage calendar events. Use when the user asks to: (1) check, read, or search emails/inbox, (2) list, view, create, or edit calendar events, (3) check available/shared calendars. Does NOT support sending emails. All commands are executed via the `d-msgraph` CLI using Bash."
---

# d-msgraph CLI

CLI tool for Microsoft Graph API operations. Execute all commands via Bash.

## Authentication

If a command fails with an auth error, run:

```bash
d-msgraph auth login
```

Check current auth status with `d-msgraph auth status`.

## Mail (Read Only)

### List messages

```bash
# Default: latest 25 messages
d-msgraph mail list

# Recent messages with time filter
d-msgraph mail list --since last60min
d-msgraph mail list --since last6hours
d-msgraph mail list --since today
d-msgraph mail list --since yesterday
d-msgraph mail list --since last7days
d-msgraph mail list --since 2024-03-15

# Limit count
d-msgraph mail list -n 10

# JSON output
d-msgraph mail list --format json
```

`--since` values: `last{N}min`, `last{N}hours`, `last{N}days`, `today`, `yesterday`, ISO date string.

### Read a specific message

```bash
d-msgraph mail read <messageId>
d-msgraph mail read <messageId> --format json
```

Get `messageId` from `mail list --format json` output.

## Calendar

### List events

```bash
# Next 7 days (default)
d-msgraph calendar list

# Specific date range
d-msgraph calendar list --start 2024-03-01 --end 2024-03-31

# Shared calendar
d-msgraph calendar list --calendar "ディーバ"

# Options: -n <count>, --format json, --timezone "UTC"
```

### Get event details

```bash
d-msgraph calendar get <eventId>
d-msgraph calendar get <eventId> --format json
```

### Create event

```bash
d-msgraph calendar add -s "Subject" --start "2024-03-15T10:00:00" --end "2024-03-15T11:00:00"

# Full options
d-msgraph calendar add -s "Meeting" \
  --start "2024-03-15T10:00:00" \
  --end "2024-03-15T11:00:00" \
  --location "Room A" \
  --attendees "user1@example.com,user2@example.com" \
  --online \
  --timezone "Asia/Tokyo" \
  --calendar "ディーバ"

# All-day event
d-msgraph calendar add -s "Holiday" --start "2024-03-15" --end "2024-03-16" --all-day
```

### Edit event

```bash
d-msgraph calendar edit <eventId> -s "New Subject"
d-msgraph calendar edit <eventId> --start "2024-03-15T14:00:00" --end "2024-03-15T15:00:00"
d-msgraph calendar edit <eventId> --location "Room B" --timezone "Asia/Tokyo"
```

`get` and `edit` use event ID directly; `--calendar` is not needed.

### List calendars

```bash
d-msgraph calendar calendars
d-msgraph calendar calendars --format json
```

Use this to find the calendar name for `--calendar` option.

## Notes

- Timezone defaults to OS setting (typically `Asia/Tokyo`); override with `--timezone`
- `--calendar` accepts partial name match (e.g., "ディーバ" matches "ディーバ共有カレンダー")
- Use `--format json` when structured data is needed for further processing
- Add `--verbose` before subcommand for debug info: `d-msgraph --verbose calendar list`
