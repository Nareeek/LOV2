# API Agent Instructions

This folder contains the NestJS/Fastify backend.

## Key Files

- `src/main.ts`
  - app bootstrap
  - Fastify adapter
  - security middleware
  - cookies
  - CORS
  - CSRF
  - validation
  - Swagger

- `src/app.module.ts`
  - root module

- `src/auth/*`
  - auth/session logic

- `src/game/game.controller.ts`
  - game HTTP routes

- `src/game/game-commands.service.ts`
  - main game use-cases

- `src/game/travel-queue.service.ts`
  - travel queue scheduling

- `src/payments/*`
  - Stripe/payment logic

- `prisma/schema.prisma`
  - database schema

## Rules

- Keep game authority on the server.
- Validate DTOs.
- Use Prisma transactions for multi-step economy/progression changes.
- Record important actions as `GameEvent`.
- Keep pure formulas in `packages/shared`, not inside API services.
- Do not trust frontend-provided rewards, stats, prices, combat results, or payment status.
- Keep Stripe sandbox behavior unless production payment policy is explicitly added.

## Common Tasks

### Add backend game action

Inspect:

- `src/game/game.controller.ts`
- `src/game/game.dto.ts`
- `src/game/game-commands.service.ts`
- `prisma/schema.prisma` only if persistence changes

### Change combat/progression formula

Prefer changing:

- `packages/shared/src/rules.ts`
- `packages/shared/src/rules.test.ts`

Then update API only if integration changes.

### Change auth/security

Inspect:

- `src/main.ts`
- `src/auth/*`
- `apps/web/src/lib/api.ts`

### Change database schema

Inspect:

- `prisma/schema.prisma`
- affected service
- affected tests

## Checks

```bash
pnpm --filter @lov2/api check
pnpm --filter @lov2/api test
```

For schema changes:

```bash
pnpm --filter @lov2/api prisma:migrate
```