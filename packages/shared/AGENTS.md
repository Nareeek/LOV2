# Shared Package Agent Instructions

This package contains pure domain rules and shared types.

## Key Files

- `src/rules.ts`
- `src/types.ts`
- `src/rules.test.ts`

## Responsibility

This is the shared domain kernel.

Correct place for:

- XP/level rules
- energy rules
- combat rules
- stats/equipment calculations
- rebirth rules
- shared domain types

## Rules

- Keep functions pure where possible.
- Avoid database dependencies.
- Avoid HTTP dependencies.
- Avoid browser dependencies.
- Avoid NestJS/React/framework dependencies.
- Add or update tests for formula changes.
- Prefer deterministic logic.
- Keep names and types clear because both frontend and backend may depend on them.

## When To Edit This Package

Edit this package when changing:

- combat math
- energy spending/refill/reset
- XP thresholds
- level calculation
- health calculation
- equipment stat bonuses
- armor calculation
- rebirth requirements or reset logic

## Checks

```bash
pnpm --filter @lov2/shared check
pnpm --filter @lov2/shared test
```