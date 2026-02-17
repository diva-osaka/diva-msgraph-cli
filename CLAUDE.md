# d-msgraph-cli Development Guidelines

## Project Overview
Microsoft Graph API を利用したCLIツール。メールとカレンダーの操作を提供する。

## Tech Stack
- TypeScript + Node.js (CommonJS)
- Commander.js (CLI framework)
- MSAL Node (Azure AD authentication)
- Microsoft Graph Client SDK

## Project Structure
```
src/
  index.ts          - CLI entry point (Commander.js)
  types/index.ts    - TypeScript interfaces
  commands/         - CLI command implementations
  services/         - Business logic (auth, graph client)
  utils/            - Utilities (config, errors)
```

## Commands
```bash
npm run dev         # Run in development mode (tsx)
npm run build       # Compile TypeScript
npm run start       # Run compiled JS
npm run test        # Run tests (vitest)
npm run lint        # Lint with ESLint
npm run clean       # Remove dist/
```

## Authentication
- Device Code Flow: Interactive user authentication
- Client Credentials Flow: Application-level authentication
- Token cache: ~/.d-msgraph-cli/token-cache.json

## Coding Conventions
- Use single quotes, semicolons, 2-space indentation
- Follow @typescript-eslint/recommended rules
- Error handling: Use GraphCliError class from src/utils/errors.ts
- Config priority: CLI flags > environment variables > config file
