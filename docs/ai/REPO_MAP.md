# LOV2 Repo Map

## Top-Level Structure

```txt
apps/
  web/       Browser client
  api/       Backend API
  worker/    Background jobs

packages/
  shared/        Shared types and pure game rules
  game-data/     Versioned validated game data
  art-pipeline/  Asset manifest/helpers
```

## Important Files

### Frontend

- `apps/web/src/App.tsx`
  - auth screen
  - registration/login flow
  - character creation
  - entry into game shell

- `apps/web/src/lib/api.ts`
  - frontend API client
  - CSRF handling
  - cookie credentials
  - typed backend calls

- `apps/web/src/components/game/GameShell.tsx`
  - main game UI controller
  - world/travel/combat/sheet states
  - handles game intents

- `apps/web/src/game/flow.ts`
  - frontend game-flow helper logic

### Backend

- `apps/api/src/main.ts`
  - NestJS bootstrap
  - Fastify adapter
  - Helmet
  - cookies
  - CORS
  - CSRF guard
  - validation pipe
  - Swagger docs

- `apps/api/src/app.module.ts`
  - root module
  - imports auth/game/payments/prisma modules

- `apps/api/src/game/game.controller.ts`
  - HTTP endpoints for game actions

- `apps/api/src/game/game-commands.service.ts`
  - main backend game use-case/business logic

- `apps/api/src/game/travel-queue.service.ts`
  - API-side travel job scheduling

- `apps/api/prisma/schema.prisma`
  - database schema

### Worker

- `apps/worker/src/main.ts`
  - BullMQ worker
  - marks travel tasks as arrived
  - writes game events

### Shared Domain

- `packages/shared/src/rules.ts`
  - energy logic
  - level/XP logic
  - combat resolution
  - equipment stats
  - rebirth logic

- `packages/shared/src/types.ts`
  - shared domain types

### Game Data

- `packages/game-data/src/index.ts`
  - races
  - items
  - locations
  - enemies
  - quests
  - scenes
  - data validation

### Art Pipeline

- `packages/art-pipeline/src/index.ts`
  - asset manifest records
  - asset path, kind, license, and source/provenance metadata

- `scripts/validate-assets.mjs`
  - validates generated asset files exist
  - checks game-data asset references against the art manifest
```
