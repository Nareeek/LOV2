import { describe, expect, it, vi } from 'vitest';
import { gameData } from '@lov2/game-data';
import {
  DEFAULT_MAX_ENERGY,
  ENERGY_REFILL_LARGE,
  ENERGY_REFILL_LARGE_GEMS_COST,
  ENERGY_REFILL_SMALL,
  ENERGY_REFILL_SMALL_GEMS_COST,
  hasEnoughEnergy,
  refillEnergy,
  resolveCombat,
  spendEnergy,
  type CombatEncounter,
  type CombatLog,
} from '@lov2/shared';
import { GameCommandsService } from './game-commands.service.js';

describe('vertical slice game data contract', () => {
  it('has a tavern quest that leads to travel and combat', () => {
    const quest = gameData.quests.find((entry) => entry.id === 'tavern-first-contract');
    expect(quest).toBeDefined();
    expect(gameData.locations.some((location) => location.id === quest?.locationId)).toBe(true);
    expect(gameData.enemies.some((enemy) => enemy.id === quest?.enemyId)).toBe(true);
  });

  it('keeps resolved combat logs JSON serializable for bootstrap', () => {
    const enemy = gameData.enemies[0]!;
    const log = resolveCombat({
      characterStats: { сила: 14, ловкость: 12, интуиция: 10, удача: 9 },
      characterLevel: 2,
      characterHealth: 180,
      enemy,
      reward: enemy.reward,
    });
    const encounter: CombatEncounter = {
      id: 'combat-test',
      characterId: 'character-test',
      enemyId: enemy.id,
      status: log.winner === 'character' ? 'won' : 'lost',
      log,
      createdAt: new Date().toISOString(),
    };

    const roundTrip = JSON.parse(JSON.stringify(encounter)) as CombatEncounter;
    expect(roundTrip.log?.turns.length).toBeGreaterThan(0);
    expect(roundTrip.log?.reward).toEqual(log.reward);
  });

  it('assigns positive energy costs to starter quests', () => {
    expect(gameData.quests.length).toBeGreaterThan(0);
    expect(gameData.quests.every((quest) => quest.energyCost > 0)).toBe(true);
  });

  it('models travel energy spending and gem refills for command handlers', () => {
    const quest = gameData.quests.find((entry) => entry.id === 'tavern-first-contract');
    expect(quest).toBeDefined();
    expect(ENERGY_REFILL_SMALL_GEMS_COST).toBeGreaterThan(0);
    expect(ENERGY_REFILL_LARGE_GEMS_COST).toBeGreaterThan(ENERGY_REFILL_SMALL_GEMS_COST);

    const currentEnergy = DEFAULT_MAX_ENERGY;
    expect(hasEnoughEnergy(currentEnergy, quest!.energyCost)).toBe(true);

    const spentEnergy = spendEnergy(currentEnergy, quest!.energyCost);
    expect(spentEnergy).toBe(currentEnergy - quest!.energyCost);
    expect(refillEnergy(spentEnergy, DEFAULT_MAX_ENERGY)).toBe(DEFAULT_MAX_ENERGY);
    expect(refillEnergy(20, DEFAULT_MAX_ENERGY, ENERGY_REFILL_SMALL)).toBe(25);
    expect(refillEnergy(12, DEFAULT_MAX_ENERGY, ENERGY_REFILL_LARGE)).toBe(DEFAULT_MAX_ENERGY);
  });
});

describe('GameCommandsService combat pet authority', () => {
  const now = new Date('2026-05-07T12:00:00.000Z');
  const baseStats = {
    '\u0441\u0438\u043b\u0430': 28,
    '\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c': 26,
    '\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f': 26,
    '\u0443\u0434\u0430\u0447\u0430': 20,
  };
  const character = {
    id: 'character-1',
    userId: 'user-1',
    name: 'Tester',
    raceId: 'nocturne',
    gender: 'male',
    classId: 'swordsman',
    level: 10,
    experience: 0,
    rebirths: 0,
    health: 4000,
    maxHealth: 4000,
    unspentStatPoints: 0,
    stats: baseStats,
    gold: 120,
    gems: 0,
    energy: DEFAULT_MAX_ENERGY,
    maxEnergy: DEFAULT_MAX_ENERGY,
    energyUpdatedAt: now,
    createdAt: now,
    updatedAt: now,
  };
  const combat = {
    id: 'combat-1',
    characterId: character.id,
    enemyId: 'baron-of-ashes',
    questId: null,
    status: 'pending',
    log: null,
    createdAt: now,
    updatedAt: now,
  };
  const user = {
    id: character.userId,
    email: 'tester@example.test',
    displayName: 'Tester',
    passwordHash: 'hash',
    createdAt: now,
  };

  function createHarness(
    equipped: Array<{
      id: string;
      characterId: string;
      itemId: string;
      quantity: number;
      enhancementLevel: number;
      equippedSlot: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
  ) {
    const transactionClient = {
      combatEncounter: { update: vi.fn() },
      character: { update: vi.fn() },
      currencyLedgerEntry: { create: vi.fn() },
      inventoryStack: { upsert: vi.fn() },
      questProgress: { update: vi.fn() },
      gameEvent: { create: vi.fn() },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      character: {
        findFirst: vi.fn().mockResolvedValue(character),
        update: vi.fn().mockResolvedValue(character),
      },
      inventoryStack: { findMany: vi.fn().mockResolvedValue(equipped) },
      questProgress: { findMany: vi.fn().mockResolvedValue([]) },
      travelTask: { findMany: vi.fn().mockResolvedValue([]) },
      combatEncounter: {
        findFirst: vi.fn().mockResolvedValue(combat),
        findMany: vi.fn().mockResolvedValue([]),
      },
      $transaction: vi.fn(async (callback: (tx: typeof transactionClient) => Promise<unknown>) =>
        callback(transactionClient),
      ),
    };
    const notifications = { emitCharacterEvent: vi.fn() };
    const travelQueue = { scheduleArrival: vi.fn() };
    const service = new GameCommandsService(
      prisma as unknown as ConstructorParameters<typeof GameCommandsService>[0],
      notifications as unknown as ConstructorParameters<typeof GameCommandsService>[1],
      travelQueue as unknown as ConstructorParameters<typeof GameCommandsService>[2],
    );

    return { service, transactionClient };
  }

  function resolvedLog(transactionClient: ReturnType<typeof createHarness>['transactionClient']) {
    return transactionClient.combatEncounter.update.mock.calls[0]?.[0].data.log as CombatLog;
  }

  it('does not grant pet assist for arbitrary client petId', async () => {
    const { service, transactionClient } = createHarness([]);

    await service.resolveCombat(character.userId, combat.id, { petId: 'kitten' });

    const log = resolvedLog(transactionClient);
    expect(log.petId).toBeUndefined();
    expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
  });

  it.each([{ petId: undefined }, { petId: 'kitten' }])(
    'does not grant pet assist for missing or invalid petId',
    async ({ petId }) => {
      const { service, transactionClient } = createHarness([
        {
          id: 'stack-pet',
          characterId: character.id,
          itemId: 'ember-whelp',
          quantity: 1,
          enhancementLevel: 0,
          equippedSlot: 'pet',
          createdAt: now,
          updatedAt: now,
        },
      ]);

      await service.resolveCombat(character.userId, combat.id, petId ? { petId } : {});

      const log = resolvedLog(transactionClient);
      expect(log.petId).toBeUndefined();
      expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
    },
  );

  it('grants pet assist for a server-owned equipped pet', async () => {
    const { service, transactionClient } = createHarness([
      {
        id: 'stack-pet',
        characterId: character.id,
        itemId: 'ember-whelp',
        quantity: 1,
        enhancementLevel: 0,
        equippedSlot: 'pet',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await service.resolveCombat(character.userId, combat.id, { petId: 'ember-whelp' });

    const log = resolvedLog(transactionClient);
    expect(log.petId).toBe('ember-whelp');
    expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(true);
  });
});
