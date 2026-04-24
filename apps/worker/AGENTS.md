# Worker Agent Instructions

This folder contains background workers.

## Key Files

- `src/main.ts`
  - BullMQ worker
  - Redis connection
  - Prisma client
  - travel arrival processing

## Responsibility

The worker handles async jobs that should not be completed directly in the request/response path.

Current main job:

- `travel-events`
- `mark-arrived`

## Rules

- Keep jobs idempotent where possible.
- Check current DB state before updating.
- Do not assume the job is still valid when it runs.
- Use database transactions for multi-step updates.
- Close worker, queue, Prisma, and Redis connections on shutdown.
- Keep game rules in `packages/shared` if they are pure/deterministic.
- Keep API scheduling logic in `apps/api/src/game/travel-queue.service.ts`.

## Related API Files

For travel jobs, inspect:

- `apps/api/src/game/travel-queue.service.ts`
- `apps/api/src/game/game-commands.service.ts`

## Checks

```bash
pnpm --filter @lov2/worker check
pnpm --filter @lov2/worker test
```

If changing API scheduling too:

```bash
pnpm --filter @lov2/api test
```