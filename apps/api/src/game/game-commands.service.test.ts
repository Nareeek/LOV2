import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { gameData } from '@lov2/game-data';
import {
  BACKPACK_SLOT_COUNT,
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
  type CharacterClassId,
  type CombatEncounter,
  type CombatLog,
  type PetCombatStats,
  type StatKey,
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

describe('GameCommandsService quest travel combat vertical slice', () => {
  const now = new Date('2026-05-07T12:00:00.000Z');
  const quest = gameData.quests.find((entry) => entry.id === 'tavern-first-contract')!;
  const ashBaronQuest = gameData.quests.find((entry) => entry.id === 'ash-baron-duel')!;
  const emberWhelpQuest = gameData.quests.find((entry) => entry.id === 'ember-whelp-first-flight')!;
  const strongStats = {
    '\u0441\u0438\u043b\u0430': 30,
    '\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c': 26,
    '\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f': 24,
    '\u0443\u0434\u0430\u0447\u0430': 18,
  };
  const weakStats = {
    '\u0441\u0438\u043b\u0430': 1,
    '\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c': 1,
    '\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f': 1,
    '\u0443\u0434\u0430\u0447\u0430': 1,
  };

  function createVerticalHarness({
    initialQuestStatus,
    characterOverride = {},
  }: {
    initialQuestStatus?: 'available' | 'active' | 'completed' | 'claimed';
    characterOverride?: Record<string, unknown>;
  } = {}) {
    const user = {
      id: 'user-vertical',
      email: 'vertical@example.test',
      displayName: 'Vertical',
      passwordHash: 'hash',
      createdAt: now,
    };
    const character = {
      id: 'character-vertical',
      userId: user.id,
      name: 'Vertical',
      raceId: 'nocturne',
      gender: 'male',
      classId: 'swordsman',
      level: 10,
      experience: 0,
      rebirths: 0,
      health: 4000,
      maxHealth: 4000,
      unspentStatPoints: 0,
      stats: strongStats,
      gold: 0,
      gems: 0,
      petFood: 10,
      energy: DEFAULT_MAX_ENERGY,
      maxEnergy: DEFAULT_MAX_ENERGY,
      energyUpdatedAt: now,
      createdAt: now,
      updatedAt: now,
      ...characterOverride,
    };
    const state = {
      user,
      character,
      inventory: [] as Array<Record<string, unknown>>,
      petRoster: gameData.items
        .filter((item) => item.slot === 'pet')
        .map((item) => ({
          id: `pet-roster-${item.id}`,
          characterId: character.id,
          petId: item.id,
          food: item.id === 'ember-whelp' ? 4 : 0,
          experience: 0,
          createdAt: now,
          updatedAt: now,
        })) as Array<Record<string, unknown>>,
      questProgress: initialQuestStatus
        ? [
            {
              id: 'quest-progress-vertical',
              characterId: character.id,
              questId: quest.id,
              status: initialQuestStatus,
              progress: initialQuestStatus === 'completed' || initialQuestStatus === 'claimed' ? 1 : 0,
              target: 1,
              createdAt: now,
              updatedAt: now,
            },
          ]
        : ([] as Array<Record<string, unknown>>),
      travels: [] as Array<Record<string, unknown>>,
      combats: [] as Array<Record<string, unknown>>,
      ledgers: [] as Array<Record<string, unknown>>,
      events: [] as Array<Record<string, unknown>>,
    };

    const applyCharacterUpdate = (data: Record<string, unknown>) => {
      for (const [key, value] of Object.entries(data)) {
        const mutableCharacter = state.character as Record<string, unknown>;
        const currentValue = Number(mutableCharacter[key] ?? 0);
        if (value && typeof value === 'object' && 'increment' in value) {
          mutableCharacter[key] = currentValue + (value as { increment: number }).increment;
        } else if (value && typeof value === 'object' && 'decrement' in value) {
          mutableCharacter[key] = currentValue - (value as { decrement: number }).decrement;
        } else {
          mutableCharacter[key] = value;
        }
      }
      return state.character;
    };
    const findQuestProgress = (questId: string) =>
      state.questProgress.find(
        (progress) => progress.characterId === character.id && progress.questId === questId,
      );
    const findTravel = (id: string) =>
      state.travels.find((travel) => travel.id === id && travel.characterId === character.id);
    const findCombat = (id: string) =>
      state.combats.find((combat) => combat.id === id && combat.characterId === character.id);
    const findInventoryStack = (id: string) =>
      state.inventory.find((item) => item.id === id && item.characterId === character.id);
    const findPetRoster = (petId: string) =>
      state.petRoster.find((pet) => pet.characterId === character.id && pet.petId === petId);
    const matchesStatus = (actual: unknown, expected: unknown) => {
      if (expected && typeof expected === 'object' && 'in' in expected) {
        return (expected as { in: unknown[] }).in.includes(actual);
      }
      return actual === expected;
    };

    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      character: {
        findFirst: vi.fn().mockResolvedValue(state.character),
        update: vi.fn(async ({ data }: { data: Record<string, unknown> }) =>
          applyCharacterUpdate(data),
        ),
        updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          if (
            typeof where.gems === 'object' &&
            where.gems &&
            'gte' in where.gems &&
            state.character.gems < (where.gems as { gte: number }).gte
          ) {
            return { count: 0 };
          }
          applyCharacterUpdate(data);
          return { count: 1 };
        }),
      },
      inventoryStack: {
        findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) => {
          return state.inventory.filter((item) => {
            if (where?.characterId && item.characterId !== where.characterId) {
              return false;
            }
            if (where?.equippedSlot) {
              const equippedSlot = where.equippedSlot;
              if (
                equippedSlot &&
                typeof equippedSlot === 'object' &&
                'not' in equippedSlot &&
                item.equippedSlot === (equippedSlot as { not: unknown }).not
              ) {
                return false;
              }
              if (typeof equippedSlot === 'string' && item.equippedSlot !== equippedSlot) {
                return false;
              }
            }
            return true;
          });
        }),
        findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
          return (
            state.inventory.find((item) => {
              if (where.id && item.id !== where.id) {
                return false;
              }
              if (where.characterId && item.characterId !== where.characterId) {
                return false;
              }
              return true;
            }) ?? null
          );
        }),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const created = {
            id: `inventory-${state.inventory.length + 1}`,
            enhancementLevel: 0,
            equippedSlot: null,
            createdAt: now,
            updatedAt: now,
            ...data,
          };
          state.inventory.push(created);
          return created;
        }),
        updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          let count = 0;
          for (const item of state.inventory) {
            if (where.characterId && item.characterId !== where.characterId) {
              continue;
            }
            if (where.equippedSlot && item.equippedSlot !== where.equippedSlot) {
              continue;
            }
            Object.assign(item, data);
            count += 1;
          }
          return { count };
        }),
        update: vi.fn(async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const stack = findInventoryStack(where.id);
          if (!stack) {
            throw new Error('missing inventory stack');
          }
          Object.assign(stack, data);
          return stack;
        }),
      },
      characterPet: {
        findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) =>
          state.petRoster.filter((pet) => !where?.characterId || pet.characterId === where.characterId),
        ),
        findUnique: vi.fn(async ({ where }: { where: { characterId_petId: { petId: string } } }) =>
          findPetRoster(where.characterId_petId.petId) ?? null,
        ),
        update: vi.fn(async ({ where, data }: { where: { characterId_petId: { petId: string } }; data: Record<string, unknown> }) => {
          const pet = findPetRoster(where.characterId_petId.petId);
          if (!pet) {
            throw new Error('missing pet roster');
          }
          for (const [key, value] of Object.entries(data)) {
            const currentValue = Number(pet[key] ?? 0);
            if (value && typeof value === 'object' && 'increment' in value) {
              pet[key] = currentValue + (value as { increment: number }).increment;
            } else if (value && typeof value === 'object' && 'decrement' in value) {
              pet[key] = currentValue - (value as { decrement: number }).decrement;
            } else {
              pet[key] = value;
            }
          }
          pet.updatedAt = now;
          return pet;
        }),
      },
      questProgress: {
        findMany: vi.fn().mockImplementation(async () => state.questProgress),
        findUnique: vi.fn(async ({ where }: { where: { characterId_questId: { questId: string } } }) =>
          findQuestProgress(where.characterId_questId.questId) ?? null,
        ),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const created = {
            id: `quest-progress-${state.questProgress.length + 1}`,
            progress: 0,
            target: 1,
            ...data,
          };
          state.questProgress.push(created);
          return created;
        }),
        update: vi.fn(async ({ where, data }: { where: { characterId_questId: { questId: string } }; data: Record<string, unknown> }) => {
          const progress = findQuestProgress(where.characterId_questId.questId);
          if (!progress) {
            throw new Error('missing quest progress');
          }
          Object.assign(progress, data);
          return progress;
        }),
      },
      travelTask: {
        findMany: vi.fn().mockImplementation(async () => state.travels),
        findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
          if (typeof where.id === 'string') {
            return findTravel(where.id) ?? null;
          }
          if (where.status) {
            return state.travels.find((travel) => matchesStatus(travel.status, where.status)) ?? null;
          }
          return null;
        }),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const created = {
            id: `travel-${state.travels.length + 1}`,
            status: 'traveling',
            ...data,
          };
          state.travels.push(created);
          return created;
        }),
        updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          const travel = typeof where.id === 'string' ? findTravel(where.id) : undefined;
          if (!travel || !matchesStatus(travel.status, where.status)) {
            return { count: 0 };
          }
          Object.assign(travel, data);
          return { count: 1 };
        }),
      },
      combatEncounter: {
        findMany: vi.fn().mockImplementation(async () => state.combats),
        findFirst: vi.fn(async ({ where }: { where: Record<string, unknown> }) => {
          if (typeof where.id === 'string') {
            return findCombat(where.id) ?? null;
          }
          if (where.status) {
            return state.combats.find((combat) => matchesStatus(combat.status, where.status)) ?? null;
          }
          return null;
        }),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          const created = {
            id: `combat-${state.combats.length + 1}`,
            status: 'pending',
            log: null,
            createdAt: now,
            updatedAt: now,
            ...data,
          };
          state.combats.push(created);
          return created;
        }),
        updateMany: vi.fn(async ({ where, data }: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          const combat = typeof where.id === 'string' ? findCombat(where.id) : undefined;
          if (!combat || !matchesStatus(combat.status, where.status)) {
            return { count: 0 };
          }
          Object.assign(combat, data);
          return { count: 1 };
        }),
      },
      currencyLedgerEntry: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          state.ledgers.push(data);
          return data;
        }),
      },
      gameEvent: {
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          state.events.push(data);
          return data;
        }),
      },
      $transaction: vi.fn(async (input: ((tx: unknown) => Promise<unknown>) | Array<Promise<unknown>>) => {
        if (Array.isArray(input)) {
          return Promise.all(input);
        }
        return input(prisma);
      }),
    };
    const notifications = { emitCharacterEvent: vi.fn() };
    const travelQueue = { scheduleArrival: vi.fn() };
    const service = new GameCommandsService(
      prisma as unknown as ConstructorParameters<typeof GameCommandsService>[0],
      notifications as unknown as ConstructorParameters<typeof GameCommandsService>[1],
      travelQueue as unknown as ConstructorParameters<typeof GameCommandsService>[2],
    );

    return { service, prisma, state, notifications, travelQueue };
  }

  it('keeps acceptQuest idempotent only for active quest progress', async () => {
    const { service, prisma, state, notifications } = createVerticalHarness({
      initialQuestStatus: 'active',
    });

    await service.acceptQuest(state.user.id, quest.id);

    expect(state.questProgress[0]?.status).toBe('active');
    expect(prisma.questProgress.create).not.toHaveBeenCalled();
    expect(prisma.questProgress.update).not.toHaveBeenCalled();
    expect(prisma.gameEvent.create).not.toHaveBeenCalled();
    expect(notifications.emitCharacterEvent).not.toHaveBeenCalled();
  });

  it.each(['completed', 'claimed'] as const)(
    'reactivates %s quest progress so tavern routes can repeat',
    async (status) => {
      const { service, prisma, state } = createVerticalHarness({
        initialQuestStatus: status,
      });

      const bootstrap = await service.acceptQuest(state.user.id, quest.id);

      expect(bootstrap.questProgress[0]).toMatchObject({
        questId: quest.id,
        status: 'active',
        progress: 0,
      });
      expect(prisma.questProgress.update).toHaveBeenCalledTimes(1);
      expect(prisma.gameEvent.create).toHaveBeenCalledTimes(1);
    },
  );

  it('activates available quest progress once', async () => {
    const { service, prisma, state, notifications } = createVerticalHarness({
      initialQuestStatus: 'available',
    });

    const bootstrap = await service.acceptQuest(state.user.id, quest.id);

    expect(bootstrap.questProgress[0]?.status).toBe('active');
    expect(prisma.questProgress.update).toHaveBeenCalledTimes(1);
    expect(prisma.gameEvent.create).toHaveBeenCalledTimes(1);
    expect(notifications.emitCharacterEvent).toHaveBeenCalledWith(
      state.character.id,
      'quest.updated',
      { questId: quest.id, status: 'active' },
    );
  });

  it('runs accept quest, travel, claim, quest combat, and reward once through bootstrap state', async () => {
    const { service, prisma, state, travelQueue } = createVerticalHarness();

    const accepted = await service.acceptQuest(state.user.id, quest.id);
    expect(accepted.questProgress).toMatchObject([
      { questId: quest.id, status: 'active', progress: 0, target: 1 },
    ]);

    const started = await service.startTravel(state.user.id, {
      locationId: quest.locationId,
      questId: quest.id,
    });
    expect(started.character?.energy).toBe(DEFAULT_MAX_ENERGY - quest.energyCost);
    expect(started.travels[0]).toMatchObject({
      questId: quest.id,
      locationId: quest.locationId,
      status: 'traveling',
    });
    expect(travelQueue.scheduleArrival).toHaveBeenCalledTimes(1);

    Object.assign(state.travels[0]!, {
      status: 'arrived',
      completesAt: new Date(now.getTime() - 1000),
    });
    const claimed = await service.claimTravel(state.user.id, String(state.travels[0]!.id));
    expect(claimed.travels[0]).toMatchObject({ questId: quest.id, status: 'claimed' });
    expect(claimed.combats[0]).toMatchObject({
      questId: quest.id,
      enemyId: quest.enemyId,
      status: 'pending',
    });
    expect(prisma.combatEncounter.create).toHaveBeenCalledWith({
      data: { characterId: state.character.id, questId: quest.id, enemyId: quest.enemyId, source: 'travel' },
    });
    expect(claimed.character?.petFood).toBe(10);
    expect(state.events.find((event) => event.type === 'travel.completed')?.payload).toMatchObject({
      questId: quest.id,
      enemyId: quest.enemyId,
    });
    expect(state.events.find((event) => event.type === 'travel.completed')?.payload).not.toHaveProperty(
      'petFoodGained',
    );

    const combatId = String(state.combats[0]!.id);
    const resolved = await service.resolveCombat(state.user.id, combatId);
    expect(resolved.questProgress[0]).toMatchObject({
      questId: quest.id,
      status: 'completed',
      progress: 1,
    });
    expect(resolved.combats[0]).toMatchObject({ questId: quest.id, status: 'won' });
    expect(resolved.combats[0]?.log?.reward).toEqual(quest.reward);
    expect(resolved.character?.petFood).toBe(10);
    expect(resolved.character?.gems).toBe(0);
    expect(state.ledgers.some((entry) => entry.currency === 'gems')).toBe(false);
    expect(state.events.find((event) => event.type === 'combat.resolved')?.payload).not.toHaveProperty(
      'petFoodGained',
    );

    const ledgerCount = state.ledgers.length;
    const inventoryCount = state.inventory.length;
    const combatEventCount = state.events.filter((event) => event.type === 'combat.resolved').length;
    await service.resolveCombat(state.user.id, combatId);

    expect(state.ledgers).toHaveLength(ledgerCount);
    expect(state.inventory).toHaveLength(inventoryCount);
    expect(state.events.filter((event) => event.type === 'combat.resolved')).toHaveLength(
      combatEventCount,
    );
    expect(prisma.questProgress.update).toHaveBeenCalledTimes(1);
  });

  it('runs the PR16 reward, equip, and pet-assisted follow-up combat slice', async () => {
    const { service, state } = createVerticalHarness({
      characterOverride: {
        level: 20,
        health: 9000,
        maxHealth: 9000,
        stats: {
          '\u0441\u0438\u043b\u0430': 160,
          '\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c': 120,
          '\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f': 110,
          '\u0443\u0434\u0430\u0447\u0430': 90,
        },
      },
    });

    await service.acceptQuest(state.user.id, ashBaronQuest.id);
    await service.startTravel(state.user.id, {
      locationId: ashBaronQuest.locationId,
      questId: ashBaronQuest.id,
    });
    Object.assign(state.travels[0]!, {
      status: 'arrived',
      completesAt: new Date(now.getTime() - 1000),
    });
    const claimedBossTravel = await service.claimTravel(state.user.id, String(state.travels[0]!.id));
    expect(claimedBossTravel.combats[0]).toMatchObject({
      questId: ashBaronQuest.id,
      enemyId: ashBaronQuest.enemyId,
      status: 'pending',
    });

    const bossCombatId = String(state.combats[0]!.id);
    const resolvedBoss = await service.resolveCombat(state.user.id, bossCombatId);
    expect(resolvedBoss.combats[0]).toMatchObject({ questId: ashBaronQuest.id, status: 'won' });
    expect(resolvedBoss.combats[0]?.log?.reward.itemIds).toEqual(['lucky-onyx', 'ember-whelp']);
    expect(resolvedBoss.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'lucky-onyx', quantity: 1 }),
        expect.objectContaining({ itemId: 'ember-whelp', quantity: 1 }),
      ]),
    );
    expect(resolvedBoss.questProgress.find((progress) => progress.questId === ashBaronQuest.id)).toMatchObject({
      status: 'completed',
      progress: 1,
    });

    const inventoryAfterBoss = state.inventory.map((item) => ({ itemId: item.itemId, quantity: item.quantity }));
    const combatEventsAfterBoss = state.events.filter((event) => event.type === 'combat.resolved').length;
    await service.resolveCombat(state.user.id, bossCombatId);
    expect(state.inventory.map((item) => ({ itemId: item.itemId, quantity: item.quantity }))).toEqual(
      inventoryAfterBoss,
    );
    expect(state.events.filter((event) => event.type === 'combat.resolved')).toHaveLength(
      combatEventsAfterBoss,
    );

    const luckyOnyxStack = state.inventory.find((item) => item.itemId === 'lucky-onyx');
    const emberWhelpStack = state.inventory.find((item) => item.itemId === 'ember-whelp');
    expect(luckyOnyxStack).toBeDefined();
    expect(emberWhelpStack).toBeDefined();

    const equippedOnyx = await service.equipItem(state.user.id, String(luckyOnyxStack!.id));
    expect(equippedOnyx.inventory.find((item) => item.itemId === 'lucky-onyx')).toMatchObject({
      equippedSlot: 'amulet',
    });
    const equippedPet = await service.equipItem(state.user.id, String(emberWhelpStack!.id));
    expect(equippedPet.inventory.find((item) => item.itemId === 'ember-whelp')).toMatchObject({
      equippedSlot: 'pet',
    });

    await service.acceptQuest(state.user.id, emberWhelpQuest.id);
    await service.startTravel(state.user.id, {
      locationId: emberWhelpQuest.locationId,
      questId: emberWhelpQuest.id,
    });
    Object.assign(state.travels[1]!, {
      status: 'arrived',
      completesAt: new Date(now.getTime() - 1000),
    });
    const claimedFollowUpTravel = await service.claimTravel(state.user.id, String(state.travels[1]!.id));
    expect(claimedFollowUpTravel.combats[1]).toMatchObject({
      questId: emberWhelpQuest.id,
      enemyId: emberWhelpQuest.enemyId,
      status: 'pending',
    });

    const followUpCombatId = String(state.combats[1]!.id);
    const petDefinition = gameData.items.find((item) => item.id === 'ember-whelp')!;
    const onyxDefinition = gameData.items.find((item) => item.id === 'lucky-onyx')!;
    const followUpEnemy = gameData.enemies.find((enemy) => enemy.id === emberWhelpQuest.enemyId)!;
    const expectedPetStats = petDefinition.petCombatStats!;
    const expectedLog = resolveCombat({
      characterStats: statsWithEquipment(state.character.stats, [onyxDefinition, petDefinition]),
      characterLevel: state.character.level,
      characterHealth: state.character.health,
      characterArmor: 0,
      enemy: followUpEnemy,
      reward: emberWhelpQuest.reward,
      pet: { id: 'ember-whelp', ...expectedPetStats },
    });

    const resolvedFollowUp = await service.resolveCombat(state.user.id, followUpCombatId, {
      petId: 'ember-whelp',
    });
    const followUpLog = resolvedFollowUp.combats[1]?.log;
    const firstPetTurn = followUpLog?.turns.find((turn) => turn.actor === 'pet');
    const expectedFirstPetTurn = expectedLog.turns.find((turn) => turn.actor === 'pet');

    expect(resolvedFollowUp.combats[1]).toMatchObject({ questId: emberWhelpQuest.id, status: 'won' });
    expect(followUpLog?.reward).toEqual(emberWhelpQuest.reward);
    expect(followUpLog?.petId).toBe('ember-whelp');
    expect(firstPetTurn?.damage).toBe(expectedFirstPetTurn?.damage);
    expect(resolvedFollowUp.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'ember-whelp', equippedSlot: 'pet' }),
        expect.objectContaining({ itemId: 'moon-vest', quantity: 1 }),
      ]),
    );
    expect(resolvedFollowUp.travels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ questId: ashBaronQuest.id, status: 'claimed' }),
        expect.objectContaining({ questId: emberWhelpQuest.id, status: 'claimed' }),
      ]),
    );
    expect(resolvedFollowUp.questProgress.find((progress) => progress.questId === emberWhelpQuest.id)).toMatchObject({
      status: 'completed',
      progress: 1,
    });

    const inventoryAfterFollowUp = state.inventory.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      equippedSlot: item.equippedSlot,
    }));
    const ledgersAfterFollowUp = state.ledgers.length;
    const combatEventsAfterFollowUp = state.events.filter((event) => event.type === 'combat.resolved').length;
    await service.resolveCombat(state.user.id, followUpCombatId, { petId: 'ember-whelp' });
    expect(state.inventory.map((item) => ({
      itemId: item.itemId,
      quantity: item.quantity,
      equippedSlot: item.equippedSlot,
    }))).toEqual(inventoryAfterFollowUp);
    expect(state.ledgers).toHaveLength(ledgersAfterFollowUp);
    expect(state.events.filter((event) => event.type === 'combat.resolved')).toHaveLength(
      combatEventsAfterFollowUp,
    );
  });

  it('keeps lost quest combat active and grants no quest reward', async () => {
    const { service, state } = createVerticalHarness({
      initialQuestStatus: 'active',
      characterOverride: {
        level: 1,
        health: 1,
        maxHealth: 10,
        stats: weakStats,
      },
    });
    state.combats.push({
      id: 'combat-lost',
      characterId: state.character.id,
      questId: quest.id,
      enemyId: quest.enemyId,
      status: 'pending',
      log: null,
      createdAt: now,
      updatedAt: now,
    });

    const resolved = await service.resolveCombat(state.user.id, 'combat-lost');

    expect(resolved.combats[0]).toMatchObject({ questId: quest.id, status: 'lost' });
    expect(resolved.combats[0]?.log?.reward).toEqual({
      experience: 0,
      gold: 0,
      gems: 0,
      itemIds: [],
    });
    expect(resolved.questProgress[0]).toMatchObject({
      questId: quest.id,
      status: 'active',
      progress: 0,
    });
    expect(state.ledgers).toHaveLength(0);
    expect(state.inventory).toHaveLength(0);
  });

  it('spends one active pet food and grants one pet XP on a pet-assisted win', async () => {
    const { service, state } = createVerticalHarness();
    state.inventory.push({
      id: 'inventory-ember-whelp',
      characterId: state.character.id,
      itemId: 'ember-whelp',
      quantity: 1,
      enhancementLevel: 0,
      equippedSlot: 'pet',
      createdAt: now,
      updatedAt: now,
    });
    const pet = state.petRoster.find((entry) => entry.petId === 'ember-whelp')!;
    pet.food = 4;
    pet.experience = 2;
    state.combats.push({
      id: 'combat-pet-win',
      characterId: state.character.id,
      questId: null,
      enemyId: 'mist-bandit',
      source: 'arena',
      status: 'pending',
      log: null,
      createdAt: now,
      updatedAt: now,
    });

    const resolved = await service.resolveCombat(state.user.id, 'combat-pet-win', { petId: 'ember-whelp' });

    expect(resolved.combats[0]?.log?.turns.some((turn) => turn.actor === 'pet')).toBe(true);
    expect(resolved.combats[0]?.log).toMatchObject({
      winner: 'character',
      petId: 'ember-whelp',
      petFoodSpent: 1,
      petExperienceGained: 1,
    });
    expect(resolved.petRoster.find((entry) => entry.petId === 'ember-whelp')).toMatchObject({
      food: 3,
      experience: 3,
    });
    expect(resolved.character?.petFood).toBe(10);
  });

  it('spends one active pet food and grants zero pet XP on a pet-assisted loss', async () => {
    const { service, state } = createVerticalHarness({
      characterOverride: {
        level: 1,
        health: 1,
        maxHealth: 10,
        stats: weakStats,
      },
    });
    state.inventory.push({
      id: 'inventory-ember-whelp',
      characterId: state.character.id,
      itemId: 'ember-whelp',
      quantity: 1,
      enhancementLevel: 0,
      equippedSlot: 'pet',
      createdAt: now,
      updatedAt: now,
    });
    const pet = state.petRoster.find((entry) => entry.petId === 'ember-whelp')!;
    pet.food = 4;
    pet.experience = 2;
    state.combats.push({
      id: 'combat-pet-loss',
      characterId: state.character.id,
      questId: null,
      enemyId: 'baron-of-ashes',
      source: 'arena',
      status: 'pending',
      log: null,
      createdAt: now,
      updatedAt: now,
    });

    const resolved = await service.resolveCombat(state.user.id, 'combat-pet-loss', { petId: 'ember-whelp' });

    expect(resolved.combats[0]?.log?.turns.some((turn) => turn.actor === 'pet')).toBe(true);
    expect(resolved.combats[0]?.log).toMatchObject({
      winner: 'enemy',
      petId: 'ember-whelp',
      petFoodSpent: 1,
    });
    expect(resolved.combats[0]?.log?.petExperienceGained).toBeUndefined();
    expect(resolved.petRoster.find((entry) => entry.petId === 'ember-whelp')).toMatchObject({
      food: 3,
      experience: 2,
    });
    expect(resolved.character?.petFood).toBe(10);
  });

  it('feeds a roster pet from hero pet food with server clamping', async () => {
    const { service, state } = createVerticalHarness();
    state.character.petFood = 6;
    const pet = state.petRoster.find((entry) => entry.petId === 'ember-whelp')!;
    pet.food = 0;

    const fed = await service.feedPet(state.user.id, 'ember-whelp', { amount: 10 });

    expect(fed.character?.petFood).toBe(0);
    expect(fed.petRoster.find((entry) => entry.petId === 'ember-whelp')).toMatchObject({
      food: 6,
      experience: 0,
    });
    expect(state.events.find((event) => event.type === 'pet.fed')?.payload).toMatchObject({
      petId: 'ember-whelp',
      amount: 6,
    });
  });

  it('purchases a class-matching shop item when the backpack has a free slot', async () => {
    const { service, state } = createVerticalHarness({ characterOverride: { gold: 500 } });

    const purchased = await service.purchaseItem(state.user.id, { itemId: 'duelist-rapier' });

    expect(state.character.gold).toBe(380);
    expect(purchased.inventory).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ itemId: 'duelist-rapier', quantity: 1 }),
      ]),
    );
    expect(state.inventory.filter((stack) => !stack.equippedSlot)).toHaveLength(1);
    expect(state.events.find((event) => event.type === 'inventory.updated')?.payload).toMatchObject({
      action: 'purchase',
      itemId: 'duelist-rapier',
      currency: 'gold',
      amount: 120,
    });
  });

  it('rejects pets and off-class equipment in the standard shop', async () => {
    const { service, state } = createVerticalHarness({ characterOverride: { gold: 500, gems: 10 } });

    await expect(service.purchaseItem(state.user.id, { itemId: 'ember-whelp' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(service.purchaseItem(state.user.id, { itemId: 'starter-staff' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(state.inventory).toHaveLength(0);
    expect(state.character.gold).toBe(500);
    expect(state.character.gems).toBe(10);
  });

  it('rejects shop purchases when the backpack is full', async () => {
    const { service, state } = createVerticalHarness({ characterOverride: { gold: 500 } });
    for (let index = 0; index < BACKPACK_SLOT_COUNT; index += 1) {
      state.inventory.push({
        id: `full-stack-${index}`,
        characterId: state.character.id,
        itemId: 'lucky-onyx',
        quantity: 1,
        enhancementLevel: 0,
        equippedSlot: null,
        createdAt: now,
        updatedAt: now,
      });
    }

    await expect(service.purchaseItem(state.user.id, { itemId: 'duelist-rapier' })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(state.inventory).toHaveLength(BACKPACK_SLOT_COUNT);
    expect(state.character.gold).toBe(500);
  });

  it('claims unlinked legacy travel as non-quest combat without location quest fallback', async () => {
    const { service, prisma, state } = createVerticalHarness();
    state.travels.push({
      id: 'legacy-travel',
      characterId: state.character.id,
      locationId: 'fog-harbor',
      questId: null,
      status: 'arrived',
      startedAt: now,
      completesAt: new Date(now.getTime() - 1000),
    });

    const bootstrap = await service.claimTravel(state.user.id, 'legacy-travel');

    expect(bootstrap.combats[0]).toMatchObject({
      enemyId: 'mist-bandit',
      status: 'pending',
    });
    expect(bootstrap.combats[0]).not.toHaveProperty('questId');
    expect(prisma.combatEncounter.create).toHaveBeenCalledWith({
      data: { characterId: state.character.id, questId: null, enemyId: 'mist-bandit', source: 'travel' },
    });
    expect(state.events.find((event) => event.type === 'travel.completed')?.payload).not.toHaveProperty(
      'questId',
    );
  });
});

describe('GameCommandsService character creation', () => {
  const now = new Date('2026-05-07T12:00:00.000Z');

  function createCreationHarness() {
    const user = {
      id: 'user-create',
      email: 'create@example.test',
      displayName: 'Create',
      passwordHash: 'hash',
      createdAt: now,
    };
    let createdCharacter: Record<string, unknown> | null = null;
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      character: {
        findFirst: vi.fn(async ({ where }: { where: { userId: string } }) =>
          createdCharacter?.userId === where.userId ? createdCharacter : null,
        ),
        create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          createdCharacter = {
            id: 'character-created',
            userId: data.userId,
            name: data.name,
            raceId: data.raceId,
            gender: data.gender,
            classId: data.classId,
            level: 1,
            experience: 0,
            rebirths: 0,
            health: data.health,
            maxHealth: data.maxHealth,
            unspentStatPoints: 0,
            stats: data.stats,
            gold: 0,
            gems: 0,
            petFood: data.petFood,
            energy: data.energy,
            maxEnergy: data.maxEnergy,
            energyUpdatedAt: data.energyUpdatedAt,
            createdAt: now,
            updatedAt: now,
          };
          return createdCharacter;
        }),
        update: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
          createdCharacter = { ...createdCharacter, ...data };
          return createdCharacter;
        }),
      },
      inventoryStack: { findMany: vi.fn().mockResolvedValue([]) },
      characterPet: { findMany: vi.fn().mockResolvedValue([]) },
      questProgress: { findMany: vi.fn().mockResolvedValue([]) },
      travelTask: { findMany: vi.fn().mockResolvedValue([]) },
      combatEncounter: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const notifications = { emitCharacterEvent: vi.fn() };
    const travelQueue = { scheduleArrival: vi.fn() };
    const service = new GameCommandsService(
      prisma as unknown as ConstructorParameters<typeof GameCommandsService>[0],
      notifications as unknown as ConstructorParameters<typeof GameCommandsService>[1],
      travelQueue as unknown as ConstructorParameters<typeof GameCommandsService>[2],
    );

    return { service, prisma };
  }

  it.each([
    { classId: 'swordsman' as CharacterClassId, raceId: 'oracle', primaryStat: 'сила' as StatKey },
    { classId: 'ranger' as CharacterClassId, raceId: 'oracle', primaryStat: 'ловкость' as StatKey },
    { classId: 'mage' as CharacterClassId, raceId: 'veiled', primaryStat: 'интуиция' as StatKey },
  ])('makes $primaryStat the leading stat for a new $classId', async ({ classId, raceId, primaryStat }) => {
    const { service } = createCreationHarness();
    const state = await service.createCharacter('user-create', {
      name: 'Даррид',
      raceId,
      gender: 'male',
      classId,
    });

    const stats = state.character!.stats;
    const primaryValue = stats[primaryStat];
    for (const [stat, value] of Object.entries(stats) as Array<[StatKey, number]>) {
      if (stat !== primaryStat) {
        expect(primaryValue).toBeGreaterThan(value);
      }
    }
  });

  it.each([
    { classId: 'swordsman' as CharacterClassId, starterItemId: 'starter-sword' },
    { classId: 'ranger' as CharacterClassId, starterItemId: 'starter-bow' },
    { classId: 'mage' as CharacterClassId, starterItemId: 'starter-staff' },
  ])('creates the $classId starter weapon and unfed pet roster', async ({ classId, starterItemId }) => {
    const { service, prisma } = createCreationHarness();

    await service.createCharacter('user-create', {
      name: 'Starter',
      raceId: 'oracle',
      gender: 'male',
      classId,
    });

    const createData = prisma.character.create.mock.calls[0]?.[0].data as {
      petFood: number;
      inventory: { create: Array<{ itemId: string; quantity: number; equippedSlot: string }> };
      pets: { create: Array<{ petId: string; food: number; experience: number }> };
    };
    expect(createData.petFood).toBe(10);
    expect(createData.inventory).toEqual({
      create: [{ itemId: starterItemId, quantity: 1, equippedSlot: 'weapon' }],
    });
    expect(createData.pets.create).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ petId: 'ember-whelp', food: 0, experience: 0 }),
      ]),
    );
    expect(createData.pets.create.every((pet: { food: number }) => pet.food === 0)).toBe(true);
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
    petFood: 10,
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
      inventoryStack: { create: vi.fn() },
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
    expect(transactionClient.inventoryStack.create).not.toHaveBeenCalled();
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
    petFood: 10,
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
    inventory: Array<{
      id: string;
      characterId: string;
      itemId: string;
      quantity: number;
      enhancementLevel: number;
      equippedSlot: string | null;
      createdAt: Date;
      updatedAt: Date;
    }>,
    petRoster: Array<{
      id: string;
      characterId: string;
      petId: string;
      food: number;
      experience: number;
      createdAt: Date;
      updatedAt: Date;
    }> = [],
  ) {
    const transactionClient = {
      combatEncounter: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
      character: { update: vi.fn() },
      currencyLedgerEntry: { create: vi.fn() },
      inventoryStack: { create: vi.fn() },
      characterPet: { update: vi.fn() },
      questProgress: { update: vi.fn() },
      gameEvent: { create: vi.fn() },
    };
    const prisma = {
      user: { findUnique: vi.fn().mockResolvedValue(user) },
      character: {
        findFirst: vi.fn().mockResolvedValue(character),
        update: vi.fn().mockResolvedValue(character),
      },
      inventoryStack: {
        findMany: vi.fn(async ({ where }: { where?: Record<string, unknown> } = {}) =>
          inventory.filter((stack) => {
            if (where?.characterId && stack.characterId !== where.characterId) {
              return false;
            }
            if (where?.itemId && stack.itemId !== where.itemId) {
              return false;
            }
            if (where?.equippedSlot) {
              const equippedSlot = where.equippedSlot;
              if (
                equippedSlot &&
                typeof equippedSlot === 'object' &&
                'not' in equippedSlot &&
                stack.equippedSlot === (equippedSlot as { not: unknown }).not
              ) {
                return false;
              }
              if (typeof equippedSlot === 'string' && stack.equippedSlot !== equippedSlot) {
                return false;
              }
            }
            return true;
          }),
        ),
      },
      characterPet: {
        findMany: vi.fn().mockResolvedValue(petRoster),
        findUnique: vi.fn(async ({ where }: { where: { characterId_petId: { characterId: string; petId: string } } }) =>
          petRoster.find(
            (pet) =>
              pet.characterId === where.characterId_petId.characterId &&
              pet.petId === where.characterId_petId.petId,
          ) ?? null,
        ),
      },
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

  function equippedEmberWhelp() {
    return {
      id: 'stack-pet',
      characterId: character.id,
      itemId: 'ember-whelp',
      quantity: 1,
      enhancementLevel: 0,
      equippedSlot: 'pet',
      createdAt: now,
      updatedAt: now,
    };
  }

  function ownedEmberWhelp(food = 4, experience = 0) {
    return {
      id: 'pet-roster-ember-whelp',
      characterId: character.id,
      petId: 'ember-whelp',
      food,
      experience,
      createdAt: now,
      updatedAt: now,
    };
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

    await service.resolveCombat(character.userId, combat.id, { petId: 'missing-pet' });

    const log = resolvedLog(transactionClient);
    expect(log.petId).toBeUndefined();
    expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
  });

  it.each([{ petId: undefined }, { petId: 'duelist-rapier' }])(
    'does not grant pet assist for missing or invalid petId',
    async ({ petId }) => {
      const { service, transactionClient } = createHarness([
        equippedEmberWhelp(),
      ], [ownedEmberWhelp()]);

      await service.resolveCombat(character.userId, combat.id, petId ? { petId } : {});

      const log = resolvedLog(transactionClient);
      expect(log.petId).toBeUndefined();
      expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
    },
  );

  it('does not grant pet assist for unowned catalog petId', async () => {
    const { service, transactionClient } = createHarness([]);

    await service.resolveCombat(character.userId, combat.id, { petId: 'wyrmlet' });

    const log = resolvedLog(transactionClient);
    expect(log.petId).toBeUndefined();
    expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
  });

  it('does not grant pet assist for an owned but unequipped pet', async () => {
    const petCombatStats = { level: 7, health: 2345 };
    const { service, transactionClient } = createHarness([
      { ...equippedEmberWhelp(), equippedSlot: null },
    ], [ownedEmberWhelp()]);

    await withEmberWhelpPetCombatStats(petCombatStats, async () => {
      await service.resolveCombat(character.userId, combat.id, { petId: 'ember-whelp' });
    });

    const log = resolvedLog(transactionClient);
    expect(log.petId).toBeUndefined();
    expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
  });

  it('does not grant pet assist for an equipped non-pet item', async () => {
    const { service, transactionClient } = createHarness([
      {
        id: 'stack-weapon',
        characterId: character.id,
        itemId: 'duelist-rapier',
        quantity: 1,
        enhancementLevel: 0,
        equippedSlot: 'pet',
        createdAt: now,
        updatedAt: now,
      },
    ]);

    await service.resolveCombat(character.userId, combat.id, { petId: 'duelist-rapier' });

    const log = resolvedLog(transactionClient);
    expect(log.petId).toBeUndefined();
    expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
  });

  it('resolves combat without pet assist when no pet is requested', async () => {
    const { service, transactionClient } = createHarness([]);

    await service.resolveCombat(character.userId, combat.id);

    const log = resolvedLog(transactionClient);
    expect(log.turns.length).toBeGreaterThan(0);
    expect(log.petId).toBeUndefined();
    expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
  });

  it('does not grant pet assist when the equipped pet is not owned in the pet roster', async () => {
    const petCombatStats = { level: 7, health: 2345 };
    const { service, transactionClient } = createHarness([equippedEmberWhelp()]);

    await withEmberWhelpPetCombatStats(petCombatStats, async () => {
      await service.resolveCombat(character.userId, combat.id, { petId: 'ember-whelp' });
    });

    const log = resolvedLog(transactionClient);
    expect(log.petId).toBeUndefined();
    expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
  });

  it('does not grant pet assist when the equipped pet has no food', async () => {
    const { service, transactionClient } = createHarness([equippedEmberWhelp()], [ownedEmberWhelp(0)]);

    await service.resolveCombat(character.userId, combat.id, { petId: 'ember-whelp' });

    const log = resolvedLog(transactionClient);
    expect(log.petId).toBeUndefined();
    expect(log.turns.some((turn) => turn.actor === 'pet')).toBe(false);
  });

  it('grants pet assist using game-data stats for a server-owned equipped pet', async () => {
    const petCombatStats = { level: 7, health: 2345 };
    const { service, transactionClient } = createHarness([equippedEmberWhelp()], [ownedEmberWhelp(4, 2)]);

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
      pet: { id: 'ember-whelp', ...petCombatStats, food: 4, experience: 2 },
    });
    const firstPetTurn = log.turns.find((turn) => turn.actor === 'pet');
    const expectedFirstPetTurn = expectedLog.turns.find((turn) => turn.actor === 'pet');

    expect(log.petId).toBe('ember-whelp');
    expect(firstPetTurn?.damage).toBe(expectedFirstPetTurn?.damage);
    expect(log.petFoodSpent).toBe(1);
    expect(log.petExperienceGained).toBe(log.winner === 'character' ? 1 : undefined);
    expect(transactionClient.characterPet.update).toHaveBeenCalledWith({
      where: { characterId_petId: { characterId: character.id, petId: 'ember-whelp' } },
      data: {
        food: { decrement: 1 },
        experience: { increment: log.winner === 'character' ? 1 : 0 },
      },
    });
  });

  it.each([
    { label: 'missing', petCombatStats: undefined },
    { label: 'invalid', petCombatStats: { level: 0, health: 1800 } as PetCombatStats },
  ])(
    'does not grant pet assist when game-data combat stats are $label',
    async ({ petCombatStats }) => {
      const { service, transactionClient } = createHarness([
        equippedEmberWhelp(),
      ], [ownedEmberWhelp()]);

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
