# LOV2 Task Router

Use this file before scanning the repo.
For token-efficient work, read `docs/ai/CODEX_CONTEXT_BUDGET.md` after this file.

## Task: Understand repo structure

Read:

- `AGENTS.md`
- `docs/ai/REPO_MAP.md`
- `docs/ai/ARCHITECTURE.md`

Do not scan source files unless the user asks for implementation details.

## Task: Find where something lives

Read:

- `docs/ai/REPO_MAP.md`

Then inspect only the likely file or folder.

## Task: Frontend UI bug or component change

Read:

- `apps/web/AGENTS.md`
- `apps/web/src/App.tsx`
- `apps/web/src/lib/api.ts`
- `apps/web/src/components/game/GameShell.tsx`
- specific component file mentioned by the task

Likely commands:

```bash
pnpm --filter @lov2/web check
pnpm --filter @lov2/web test
```

Use E2E only for full user-flow changes:

```bash
pnpm --filter @lov2/web test:e2e
```

## Task: API endpoint or backend game action

Read:

- `apps/api/AGENTS.md`
- `apps/api/src/game/game.controller.ts`
- `apps/api/src/game/game-commands.service.ts`
- `apps/api/prisma/schema.prisma` only if database persistence is involved

Likely commands:

```bash
pnpm --filter @lov2/api check
pnpm --filter @lov2/api test
```

## Task: Auth, session, cookies, CSRF, CORS, security

Read:

- `apps/api/src/main.ts`
- `apps/api/src/auth/*`
- `apps/web/src/lib/api.ts`
- `apps/api/prisma/schema.prisma` if sessions/users are involved

Check:

- HttpOnly cookies
- CSRF token flow
- CORS credentials
- DTO validation
- session guard
- password hashing
- rate limiting

## Task: Combat, XP, energy, stats, equipment, rebirth

Read:

- `packages/shared/AGENTS.md`
- `packages/shared/src/rules.ts`
- `packages/shared/src/rules.test.ts`

Do not put pure formulas inside frontend or API if they belong in shared rules.

Likely command:

```bash
pnpm --filter @lov2/shared test
```

## Task: Races, items, locations, enemies, quests, scenes

Read:

- `packages/game-data/AGENTS.md`
- `packages/game-data/src/index.ts`
- `packages/game-data/src/index.test.ts`

Update validation if adding new data references.

Likely command:

```bash
pnpm --filter @lov2/game-data test
```

## Task: Travel queue / background jobs

Read:

- `apps/worker/AGENTS.md`
- `apps/worker/src/main.ts`
- `apps/api/src/game/travel-queue.service.ts`
- `apps/api/src/game/game-commands.service.ts`

Likely commands:

```bash
pnpm --filter @lov2/worker test
pnpm --filter @lov2/api test
```

## Task: Payments

Read:

- `apps/api/src/payments/*`
- `apps/web/src/lib/api.ts`
- `apps/api/prisma/schema.prisma` if payment persistence is involved

Be careful: Stripe should stay sandbox-only unless production payment policies are explicitly added.

## Task: Database schema change

Read:

- `apps/api/prisma/schema.prisma`
- affected API service
- affected tests

Expected follow-up:

```bash
pnpm --filter @lov2/api prisma:migrate
pnpm --filter @lov2/api test
```

## Task: Add tests

Pick the nearest existing test style:

- shared rules: `packages/shared/src/*.test.ts`
- game data: `packages/game-data/src/*.test.ts`
- API game logic: `apps/api/src/game/*.test.ts`
- payments: `apps/api/src/payments/*.test.ts`
- web flow: `apps/web/src/game/*.test.ts`
- E2E: `apps/web/tests/*.spec.ts`

## Task: Refactor architecture

Read:

- `docs/ai/ARCHITECTURE.md`
- `docs/ai/DESIGN_PATTERNS.md`
- relevant folder-level `AGENTS.md`

Do not introduce new architecture patterns unless the current files are becoming hard to maintain.