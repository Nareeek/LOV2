# LOV2 Architecture

## High-Level Flow

```txt
React Client
  ↓
apps/web/src/lib/api.ts
  ↓
NestJS Controller
  ↓
GameCommandsService
  ↓
Prisma/PostgreSQL
  ↓
Redis/BullMQ worker when async work is needed
```

## Frontend Responsibility

The frontend owns:

- rendering
- UI state
- user intents
- calling backend endpoints
- showing bootstrap state
- client-side interaction flow

The frontend must not be trusted for:

- economy
- combat results
- rewards
- progression
- item prices
- payment status
- authoritative character state

## Backend Responsibility

The backend owns:

- auth/session
- validation
- game commands
- persistence
- economy
- combat resolution
- travel state
- payments
- event recording
- server-authoritative progression

## Shared Package Responsibility

`packages/shared` owns pure game rules:

- energy math
- XP/level math
- health/stat calculations
- equipment modifiers
- combat formulas
- rebirth rules
- shared domain types

These functions should stay deterministic and easy to unit test.

No database, HTTP, browser, or framework dependencies should be introduced here.

## Game Data Package Responsibility

`packages/game-data` owns versioned content:

- races
- items
- enemies
- locations
- quests
- scenes
- exercises

Game data should be validated at startup/import time.

## Worker Responsibility

The worker owns async jobs such as travel arrival processing.

The API schedules the job.
The worker consumes the job.
The database stores the final state.

## Current Main Pattern

The project uses a server-authoritative command architecture:

```txt
Controller → GameCommandsService → Prisma/Queue → BootstrapState
```

## State Refresh Model

Most successful backend game commands return a fresh `BootstrapState`.

The frontend updates UI from returned state instead of locally guessing final state.

## Important Boundary

React may display state and request actions.

API decides whether the action is valid.

If a rule affects fairness, rewards, progression, economy, or persistence, it belongs on the backend or in `packages/shared`.