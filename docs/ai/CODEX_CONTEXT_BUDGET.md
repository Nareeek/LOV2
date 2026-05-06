# LOV2 Codex Context Budget

## Purpose

Spend Codex context on the smallest useful slice of the repo.

Do not scan the whole repository unless the task explicitly requires architecture-level review.

## Default Reading Order

1. `AGENTS.md`
2. `docs/ai/TASK_ROUTER.md`
3. `docs/ai/CODEX_CONTEXT_BUDGET.md`
4. `docs/ai/REPO_MAP.md`
5. `docs/ai/COMMANDS.md`
6. `docs/ai/CODEX_WINDOWS.md` when working on Windows
7. Relevant folder-level `AGENTS.md`
8. Task-specific source files

## Ignore/Skip Rule

Respect `.codexignore`.

Do not inspect generated, cached, dependency, test-output, local-env, or local-reference-asset folders unless the task explicitly asks for them.

## High-Value Files by Task

### Frontend UI

Read:

- `apps/web/AGENTS.md`
- the specific component file
- `apps/web/src/components/game/GameShell.tsx` only if stage, intent, modal, travel, combat, reward, or sheet flow is affected
- `apps/web/src/styles/README.md` before changing CSS
- the narrowest relevant CSS feature file

### Backend Game Action

Read:

- `apps/api/AGENTS.md`
- `apps/api/src/game/game.controller.ts`
- `apps/api/src/game/game.dto.ts`
- `apps/api/src/game/game-commands.service.ts`
- `packages/shared/src/rules.ts` only if pure formulas/rules are affected

### Shared Rules

Read:

- `packages/shared/AGENTS.md`
- `packages/shared/src/rules.ts`
- `packages/shared/src/rules.test.ts`

### Game Data

Read:

- `packages/game-data/AGENTS.md`
- `packages/game-data/src/index.ts`
- `packages/game-data/src/index.test.ts`

### Worker / Queue

Read:

- `apps/worker/AGENTS.md`
- `apps/worker/src/main.ts`
- `apps/api/src/game/travel-queue.service.ts`
- related API command code only if needed

### Styling

Read:

- `apps/web/src/styles/README.md`
- `apps/web/src/styles.css`
- the narrowest matching CSS file

Avoid creating new final override files unless the style README says there is no better home.

## Known Hotspots

### `apps/web/src/components/game/GameShell.tsx`

Main frontend orchestration file.

It owns:

- stage mode
- world/travel/combat/sheet routing
- modal/window state
- selected quest/item/pet state
- combat replay/reward state
- game intent handling

Avoid broad edits.

Prefer extracting small helpers/hooks only when the change is already touching nearby logic.

### `apps/api/src/game/game-commands.service.ts`

Main backend command/use-case service.

Keep authoritative game logic here or in pure shared rules.

Do not move economy, rewards, combat resolution, progression, or payment authority into React.

### `apps/web/src/styles/*`

Cascade order matters.

Use `apps/web/src/styles/README.md` before editing CSS.

Prefer feature files over broad override files.

## Check Strategy

Run the smallest relevant check:

```powershell
pnpm codex:check:web
pnpm codex:check:api
pnpm codex:check:shared
pnpm codex:check:game-data
pnpm codex:check:worker
