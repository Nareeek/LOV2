# LOV2 Commands

## Start Local Development

PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up --build
```

Open:

```txt
Frontend: http://localhost:5173/
API docs: http://localhost:4000/docs
```

## Main Checks

```bash
pnpm check
pnpm lint
pnpm test
pnpm build
```

## Docker Full Workspace Check

Use the API container for full monorepo validation because root `pnpm check`
runs API Prisma generation and Prisma CLI is available there.

When containers are running:

```bash
docker compose exec api sh -lc "pnpm lint && pnpm check && pnpm test"
```

For a one-off full workspace check:

```bash
docker compose run --rm api sh -lc "pnpm lint && pnpm check && pnpm test"
```

Keep the `web` container for frontend serving and focused frontend checks, not
full monorepo validation.

## Codex Windows Checks

Preferred on Windows:

```powershell
pnpm codex:check:web
pnpm codex:check:api
pnpm codex:check:shared
pnpm codex:check:game-data
pnpm codex:check:worker
pnpm codex:check
```

## Context Budget

Before running broad searches or full checks, read:

```txt
docs/ai/CODEX_CONTEXT_BUDGET.md
```

## E2E

```bash
pnpm test:e2e
pnpm test:e2e:docker
```

## Security Audit

```bash
pnpm security:audit
```

## Prisma

```bash
pnpm --filter @lov2/api prisma:generate
pnpm --filter @lov2/api prisma:migrate
pnpm --filter @lov2/api prisma:deploy
```

## Frontend

```bash
pnpm --filter @lov2/web check
pnpm --filter @lov2/web test
pnpm --filter @lov2/web test:e2e
pnpm --filter @lov2/web build
```

## API

```bash
pnpm --filter @lov2/api check
pnpm --filter @lov2/api test
pnpm --filter @lov2/api build
```

## Worker

```bash
pnpm --filter @lov2/worker check
pnpm --filter @lov2/worker test
pnpm --filter @lov2/worker build
```

## Shared Rules

```bash
pnpm --filter @lov2/shared check
pnpm --filter @lov2/shared test
pnpm --filter @lov2/shared build
```

## Game Data

```bash
pnpm --filter @lov2/game-data check
pnpm --filter @lov2/game-data test
pnpm --filter @lov2/game-data build
```

## Art Pipeline

```bash
pnpm --filter @lov2/art-pipeline check
pnpm --filter @lov2/art-pipeline build
pnpm assets:check
```

## Agent Rule

Run the smallest relevant command for the changed area.

Do not run full E2E unless the change affects:

- auth flow
- character creation
- main game flow
- UI routing
- travel/combat state transitions
- critical user-facing behavior
