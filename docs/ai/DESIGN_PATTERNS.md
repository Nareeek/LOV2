# LOV2 Design Patterns

## Already Used

### Monorepo / Workspace Pattern

Apps and packages are separated:

- deployable apps in `apps/*`
- reusable libraries in `packages/*`

### Layered Architecture

```txt
UI → API Controller → Service/Use-case → Database/Queue
```

### Controller-Service Pattern

NestJS controllers expose HTTP routes.

Services contain backend logic.

### Command / Use-case Pattern

`GameCommandsService` acts like a command handler for:

- create character
- accept quest
- start travel
- claim travel
- resolve combat
- equip item
- unequip item
- allocate stats
- refill energy
- purchase item
- upgrade item
- start arena
- start rebirth

### Shared Kernel

`packages/shared` contains pure domain rules and types used across apps.

Good examples:

- combat formulas
- energy rules
- XP/level rules
- stats/equipment calculations

### Data-Driven Design

`packages/game-data` stores game content as validated data.

Good examples:

- races
- enemies
- locations
- quests
- items
- scenes

### Producer-Consumer Queue

API schedules async travel work.

Worker consumes BullMQ jobs.

### UI State Machine Style

`GameShell` has explicit modes like:

- world
- travel
- combat
- sheet

This is not a formal state machine yet, but the structure is close.

## Recommended Future Patterns

### CQRS-lite

Use only if `GameCommandsService` becomes too large.

Possible split:

```txt
commands/
  create-character.command.ts
  start-travel.command.ts
  claim-travel.command.ts
  resolve-combat.command.ts
  purchase-item.command.ts
  upgrade-item.command.ts

queries/
  bootstrap.query.ts
  get-character.query.ts
```

Benefit:

- smaller files
- clearer command boundaries
- easier tests

Risk:

- too much structure too early

Recommendation:

- do not apply immediately unless changing related code anyway.

### Domain Events

The repo already has `GameEvent`.

Future explicit events could be:

- `CharacterCreated`
- `QuestAccepted`
- `TravelStarted`
- `TravelArrived`
- `TravelClaimed`
- `CombatResolved`
- `InventoryUpdated`
- `CurrencyChanged`
- `EnergyRefilled`

Useful for:

- notifications
- audit logs
- achievements
- analytics
- future social feed

### Strategy Pattern

Use for combat/reward variations when logic grows.

Example:

```txt
CombatStrategy
  BasicCombatStrategy
  BossCombatStrategy
  ArenaCombatStrategy
```

Use this only when one combat function becomes hard to maintain.

### Reducer / State Machine

Use for frontend game flow if `GameShell` state becomes too complex.

Example:

```txt
world → travel → combat → reward → world
```

Possible implementation:

- typed reducer
- explicit transition table
- XState-like model if complexity becomes high

### Repository Pattern

Use carefully.

Prisma already acts as a database abstraction.

Do not add repositories just to add repositories.

Add repository wrappers only if:

- Prisma queries become duplicated
- persistence logic becomes complex
- tests require clean data-access seams

## Pattern Recommendation

Current best path:

1. Keep current layered architecture.
2. Keep pure rules in `packages/shared`.
3. Keep game content in `packages/game-data`.
4. Split `GameCommandsService` only when it becomes painful.
5. Add explicit domain events gradually.