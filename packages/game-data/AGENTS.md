# Game Data Agent Instructions

This package contains versioned validated game data.

## Key Files

- `src/index.ts`
- `src/index.test.ts`

## Responsibility

This package owns static/versioned content:

- races
- items
- locations
- enemies
- quests
- scenes
- exercises
- asset IDs
- data validation

## Rules

- Keep game content data-driven.
- Validate references between data objects.
- Avoid putting complex gameplay formulas here.
- Put formulas in `packages/shared/src/rules.ts`.
- Keep IDs stable once used by persisted data.
- If adding an item/scene/enemy/quest, check all referenced IDs.
- If adding asset references, update known asset IDs/manifest logic where needed.

## Common Data Relationships

- quests reference locations
- quests reference enemies
- items reference icon asset IDs
- scenes reference scene asset IDs
- hotspots may reference scenes, panels, locations, or quests

## Checks

```bash
pnpm --filter @lov2/game-data check
pnpm --filter @lov2/game-data test
```