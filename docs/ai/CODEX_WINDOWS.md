# LOV2 Codex on Windows

## Purpose

This file explains the preferred Windows workflow for Codex and local AI agents.

## First files to read

Before editing code, read:

1. `AGENTS.md`
2. `docs/ai/TASK_ROUTER.md`
3. `docs/ai/CODEX_CONTEXT_BUDGET.md`
4. `docs/ai/REPO_MAP.md`
5. `docs/ai/COMMANDS.md`
6. Relevant folder-level `AGENTS.md`

For Windows command execution, also read this file.

## Preferred Windows commands

Start local development:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Run focused Codex checks:

```powershell
pnpm codex:check:web
pnpm codex:check:api
pnpm codex:check:shared
pnpm codex:check:game-data
pnpm codex:check:worker
```

Run broader check:

```powershell
pnpm codex:check
```

## Direct script usage

The package scripts above are preferred, but this also works:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/codex-check.ps1 web
powershell -ExecutionPolicy Bypass -File scripts/codex-check.ps1 api
powershell -ExecutionPolicy Bypass -File scripts/codex-check.ps1 all
```

## Rule for Codex

Run the smallest relevant check.

Use full checks only when the change affects multiple apps or shared contracts.

Use E2E only when the change affects:

- auth flow
- character creation
- main game flow
- UI routing
- travel/combat state transitions
- critical user-facing behavior

## Avoid scanning

Do not scan generated or irrelevant folders unless the task explicitly requires them:

- `node_modules`
- `dist`
- `build`
- `coverage`
- `test-results`
- `playwright-report`
- `.vite`
- `.turbo`
- `.cache`
- local database files
- logs
- temporary files

Also respect `.codexignore`.
