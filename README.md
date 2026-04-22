# LOV2

LOV2 is a Russian-first, browser-based fantasy social RPG inspired by classic 2D social RPGs. It is not a clone and does not ship copyrighted source art, names, writing, or content from the reference game.

## Stack

- `apps/web`: React, Vite, TypeScript, PixiJS.
- `apps/api`: NestJS, Fastify, Prisma, PostgreSQL, Redis, Stripe sandbox.
- `apps/worker`: BullMQ worker for async game jobs.
- `packages/shared`: shared domain types and pure game rules.
- `packages/game-data`: versioned validated game data.
- `packages/art-pipeline`: original asset manifests and metadata helpers.

## Local Development

```powershell
Copy-Item .env.example .env
docker compose up --build
```

The browser client runs at `http://localhost:5173/`; API docs are at `http://localhost:4000/docs`.
Docker Compose keeps service dependencies in named volumes so the Windows workspace stays portable.

Useful scripts:

```powershell
pnpm check
pnpm test
pnpm test:e2e
pnpm lint
pnpm --filter @lov2/api prisma:migrate
```

## Security Baseline

The API uses HttpOnly session cookies, Argon2id password hashing, Helmet, CORS with credentials,
rate limiting, DTO validation, server-authoritative economy/combat commands, and a double-submit
CSRF token for unsafe browser requests. Stripe is sandbox-only until production payment policies are
ready.

## Legal Art Direction

Reference screenshots and videos are used only to understand genre, mood, and interaction patterns. Shippable assets must be original, licensed, or generated specifically for this project with source metadata.
