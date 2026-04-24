# Web Agent Instructions

This folder contains the React/Vite frontend.

## Key Files

- `src/App.tsx`
  - auth screen
  - registration/login
  - character creation
  - game shell entry

- `src/lib/api.ts`
  - backend API client
  - CSRF token handling
  - cookie credentials
  - typed endpoint calls

- `src/components/game/GameShell.tsx`
  - main game UI state
  - user intents
  - world/travel/combat/sheet modes
  - modal/window routing

- `src/game/flow.ts`
  - frontend game-flow helper logic

## Rules

- Frontend displays state and sends user intents.
- Do not calculate authoritative rewards, combat results, prices, or economy changes here.
- Keep API calls centralized in `src/lib/api.ts`.
- Prefer typed props and shared types from `@lov2/shared`.
- Avoid duplicating backend rules in React.
- If logic must be shared, move it to `packages/shared`.

## Common Tasks

### UI component change

Inspect the specific component first.

Then inspect `GameShell.tsx` only if the component is connected to game-stage state or intents.

### API call change

Inspect:

- `src/lib/api.ts`
- matching backend controller method
- matching backend service method

### Game-flow bug

Inspect:

- `src/components/game/GameShell.tsx`
- `src/game/flow.ts`
- relevant shared types

## Checks

```bash
pnpm --filter @lov2/web check
pnpm --filter @lov2/web test
```

Use E2E only when needed:

```bash
pnpm --filter @lov2/web test:e2e
```