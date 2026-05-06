# LOV2 Agent Instructions

## Project Summary

LOV2 is a Russian-first browser fantasy RPG monorepo.

Main areas:

- `apps/web` — React + Vite + TypeScript + PixiJS client.
- `apps/api` — NestJS + Fastify + Prisma + PostgreSQL + Redis backend.
- `apps/worker` — BullMQ worker for async game jobs.
- `packages/shared` — shared domain types and pure game rules.
- `packages/game-data` — versioned game data: races, items, quests, scenes.
- `packages/art-pipeline` — asset metadata/helpers.

## Agent Rules

Before scanning the repo, check these files first:

1. `docs/ai/TASK_ROUTER.md`
2. `docs/ai/CODEX_CONTEXT_BUDGET.md`
3. `docs/ai/REPO_MAP.md`
4. `docs/ai/COMMANDS.md`
5. Relevant folder-level `AGENTS.md`

For Windows/Codex command execution, also read:

- `docs/ai/CODEX_WINDOWS.md`

Do not scan the whole repo unless necessary.

Use `docs/ai/CODEX_CONTEXT_BUDGET.md` to choose the smallest useful set of files before reading source code.

Prefer reading specific files by path.

Do not duplicate large code blocks in answers.

When modifying code:

- identify the exact area first;
- explain which files will change;
- run the smallest relevant check/test;
- preserve server-authoritative game logic;
- keep shared pure rules inside `packages/shared`.

## Common Commands

See `docs/ai/COMMANDS.md`.

## Important Boundary

React may display state and request actions.

The backend decides whether the action is valid.

Do not move authoritative economy, combat, reward, progression, or payment logic into the frontend.