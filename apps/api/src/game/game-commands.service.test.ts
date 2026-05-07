import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
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
  statsWithEquipment,
  type CombatEncounter,
  type CombatLog,
  type PetCombatStats,
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

describe('GameCommandsService command idempotency', () => {
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
    gems: 2,
    energy: DEFAULT_MAX_ENERGY,
    maxEnergy: DEFAULT_MAX_ENERGY,
    energyUpdatedAt: now,
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
  const travel = {
    id: 'travel-1',
    characterId: character.id,
    locationId: 'mist-road',
    questId: 'tavern-first-contract',
    status: 'arrived',
    startedAt: new Date('2026-05-07T11:30:00.000Z'),
    completesAt: new Date('2026-05-07T11:59:00.000Z'),
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

  function createHarness({
    travelOverride = {},
    combatOverride = {},
    travelUpdateCounts = [1],
    combatUpdateCounts = [1],
  }: {
    travelOverride?: Partial<typeof travel>;
    combatOverride?: Partial<typeof combat>;
    travelUpdateCounts?: number[];
    combatUpdateCounts?: number[];
  } = {}) {
    const resolvedTravel = { ...travel, ...travelOverride };
    const resolvedCombat = { ...combat, ...combatOverride };
    const transactionClient = {
      travelTask: {
        findFirst: vi.fn().mockResolvedValue(resolvedTravel),
        updateMany: vi.fn(),
      },
      combatEncounter: {
        create: vi.fn(),
        updateMany: vi.fn(),
      },
      character: {
        update: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      currencyLedgerEntry: { create: vi.fn() },
      inventoryStack: { upsert: vi.fn() },
      questProgress: { update: vi.fn() },
      gameEvent: { create: vi.fn() },
    };
    for (const count of travelUpdateCounts) {
      transactionClient.travelTask.updateMany.mockResolvedValueOnce({ count });
    }
    for (const count of combatUpdateCounts) {
      transactionClient.combatEncounter.updateMany.mockResolvedValueOnce({ count });
    }
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      character: {
        findFirst: vi.fn().mockResolvedValue(character),
        update: vi.fn().mockResolvedValue(character),
      },
      inventoryStack: { findMany: vi.fn().mockResolvedValue([]) },
      questProgress: { findMany: vi.fn().mockResolvedValue([]) },
      travelTask: {
        findFirst: vi.fn().mockResolvedValue(resolvedTravel),
        findMany: vi.fn().mockResolvedValue([]),
      },
      combatEncounter: {
        findFirst: vi.fn().mockResolvedValue(resolvedCombat),
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

    return { service, prisma, transactionClient, notifications };
  }

  it('does not duplicate travel rewards for duplicate claims', async () => {
    const { service, transactionClient, notifications } = createHarness({
      travelUpdateCounts: [1, 0],
    });

    await service.claimTravel(character.userId, travel.id);
    await service.claimTravel(character.userId, travel.id);

    expect(transactionClient.travelTask.updateMany).toHaveBeenCalledTimes(2);
    expect(transactionClient.combatEncounter.create).toHaveBeenCalledTimes(1);
    expect(transactionClient.gameEvent.create).toHaveBeenCalledTimes(1);
    expect(transactionClient.currencyLedgerEntry.create).not.toHaveBeenCalled();
    expect(notifications.emitCharacterEvent).toHaveBeenCalledTimes(1);
  });

  it('rejects unfinished travel without rush before granting anything', async () => {
    const { service, transactionClient, notifications } = createHarness({
      travelOverride: {
        status: 'traveling',
        completesAt: new Date(Date.now() + 60_000),
      },
    });

    await expect(service.claimTravel(character.userId, travel.id)).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(transactionClient.travelTask.updateMany).not.toHaveBeenCalled();
    expect(transactionClient.character.updateMany).not.toHaveBeenCalled();
    expect(transactionClient.combatEncounter.create).not.toHaveBeenCalled();
    expect(transactionClient.gameEvent.create).not.toHaveBeenCalled();
    expect(transactionClient.currencyLedgerEntry.create).not.toHaveBeenCalled();
    expect(notifications.emitCharacterEvent).not.toHaveBeenCalled();
  });

  it('does not spend rush gems or grant travel rewards when the guarded claim loses the race', async () => {
    const { service, transactionClient, notifications } = createHarness({
      travelOverride: {
        status: 'traveling',
        completesAt: new Date(Date.now() + 60_000),
      },
      travelUpdateCounts: [0],
    });

    await service.claimTravel(character.userId, travel.id, { rush: true });

    expect(transactionClient.travelTask.updateMany).toHaveBeenCalledTimes(1);
    expect(transactionClient.character.updateMany).not.toHaveBeenCalled();
    expect(transactionClient.combatEncounter.create).not.toHaveBeenCalled();
    expect(transactionClient.gameEvent.create).not.toHaveBeenCalled();
    expect(transactionClient.currencyLedgerEntry.create).not.toHaveBeenCalled();
    expect(notifications.emitCharacterEvent).not.toHaveBeenCalled();
  });

  it('returns safely for already claimed travel without reward writes', async () => {
    const { service, transactionClient, notifications } = createHarness({
      travelOverride: { status: 'claimed' },
    });

    await service.claimTravel(character.userId, travel.id);

    expect(transactionClient.travelTask.updateMany).not.toHaveBeenCalled();
    expect(transactionClient.character.updateMany).not.toHaveBeenCalled();
    expect(transactionClient.combatEncounter.create).not.toHaveBeenCalled();
    expect(transactionClient.gameEvent.create).not.toHaveBeenCalled();
    expect(transactionClient.currencyLedgerEntry.create).not.toHaveBeenCalled();
    expect(notifications.emitCharacterEvent).not.toHaveBeenCalled();
  });

  it('does not duplicate combat rewards for duplicate resolves', async () => {
    const { service, transactionClient, notifications } = createHarness({
      combatUpdateCounts: [1, 0],
    });

    await service.resolveCombat(character.userId, combat.id);
    await service.resolveCombat(character.userId, combat.id);

    expect(transactionClient.combatEncounter.updateMany).toHaveBeenCalledTimes(2);
    expect(transactionClient.character.update).toHaveBeenCalledTimes(1);
    expect(transactionClient.gameEvent.create).toHaveBeenCalledTimes(1);
    expect(notifications.emitCharacterEvent).toHaveBeenCalledTimes(1);
  });

  it('does not grant combat rewards when the guarded resolve loses the race', async () => {
    const { service, transactionClient, notifications } = createHarness({
      combatUpdateCounts: [0],
    });

    await service.resolveCombat(character.userId, combat.id);

    expect(transactionClient.combatEncounter.updateMany).toHaveBeenCalledTimes(1);
    expect(transactionClient.character.update).not.toHaveBeenCalled();
    expect(transactionClient.currencyLedgerEntry.create).not.toHaveBeenCalled();
    expect(transactionClient.inventoryStack.upsert).not.toHaveBeenCalled();
    expect(transactionClient.questProgress.update).not.toHaveBeenCalled();
    expect(transactionClient.gameEvent.create).not.toHaveBeenCalled();
    expect(notifications.emitCharacterEvent).not.toHaveBeenCalled();
  });

  it('returns safely for already resolved combat without reward writes', async () => {
    const { service, prisma, transactionClient, notifications } = createHarness({
      combatOverride: { status: 'won' },
    });

    await service.resolveCombat(character.userId, combat.id);

    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(transactionClient.combatEncounter.updateMany).not.toHaveBeenCalled();
    expect(transactionClient.character.update).not.toHaveBeenCalled();
    expect(transactionClient.currencyLedgerEntry.create).not.toHaveBeenCalled();
    expect(transactionClient.gameEvent.create).not.toHaveBeenCalled();
    expect(notifications.emitCharacterEvent).not.toHaveBeenCalled();
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
      combatEncounter: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
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
    return transactionClient.combatEncounter.updateMany.mock.calls[0]?.[0].data.log as CombatLog;
  }

  async function withEmberWhelpPetCombatStats<T>(
    stats: PetCombatStats | undefined,
    callback: () => Promise<T>,
  ): Promise<T> {
    const petDefinition = gameData.items.find((item) => item.id === 'ember-whelp');
    if (!petDefinition) {
      throw new Error('missing ember-whelp test item');
    }

    const mutablePet = petDefinition as typeof petDefinition & { petCombatStats?: PetCombatStats };
    const hadStats = Object.hasOwn(mutablePet, 'petCombatStats');
    const originalStats = mutablePet.petCombatStats;

    try {
      if (stats) {
        mutablePet.petCombatStats = stats;
      } else {
        delete mutablePet.petCombatStats;
      }

      return await callback();
    } finally {
      if (hadStats && originalStats) {
        mutablePet.petCombatStats = originalStats;
      } else {
        delete mutablePet.petCombatStats;
      }
    }
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

  it('resolves combat without pet assist when no pet is requested', async () => {
    const { service, transactionClient } = createHarness([]);

    await service.resolveCombat(character.userId, combat.id);

    const log = resolvedLog(transactionClient);
    expect(log.turns.length).toBeGreaterThan(0);
    expect(log.petId).toBeUndefined();
    expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
  });

  it('grants pet assist using game-data stats for a server-owned equipped pet', async () => {
    const petCombatStats = { level: 7, health: 2345 };
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

    await withEmberWhelpPetCombatStats(petCombatStats, async () => {
      await service.resolveCombat(character.userId, combat.id, { petId: 'ember-whelp' });
    });

    const log = resolvedLog(transactionClient);
    const petDefinition = gameData.items.find((item) => item.id === 'ember-whelp')!;
    const enemy = gameData.enemies.find((entry) => entry.id === combat.enemyId)!;
    const expectedLog = resolveCombat({
      characterStats: statsWithEquipment(baseStats, [petDefinition]),
      characterLevel: character.level,
      characterHealth: character.health,
      characterArmor: 0,
      enemy,
      reward: enemy.reward,
      pet: { id: 'ember-whelp', ...petCombatStats },
    });
    const firstPetTurn = log.turns.find((turn) => turn.actor === 'pet');
    const expectedFirstPetTurn = expectedLog.turns.find((turn) => turn.actor === 'pet');

    expect(log.petId).toBe('ember-whelp');
    expect(firstPetTurn?.damage).toBe(expectedFirstPetTurn?.damage);
  });

  it.each([
    { label: 'missing', petCombatStats: undefined },
    { label: 'invalid', petCombatStats: { level: 0, health: 1800 } as PetCombatStats },
  ])(
    'does not grant pet assist when game-data combat stats are $label',
    async ({ petCombatStats }) => {
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

      await withEmberWhelpPetCombatStats(petCombatStats, async () => {
        await expect(
          service.resolveCombat(character.userId, combat.id, { petId: 'ember-whelp' }),
        ).resolves.toBeDefined();
      });

      const log = resolvedLog(transactionClient);
      expect(log.petId).toBeUndefined();
      expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
    },
  );
});
