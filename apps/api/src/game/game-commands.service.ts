import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { gameData } from '@lov2/game-data';
import {
  DEFAULT_MAX_ENERGY,
  ENERGY_REFILL_GEMS_COST,
  canRebirth,
  hasEnoughEnergy,
  levelFromExperience,
  maxHealthForStats,
  refillEnergy as refillEnergyMeter,
  rebirthStats,
  resolveCombat as resolveCombatLog,
  spendEnergy,
  statsWithEquipment,
  type BootstrapState,
  type CharacterStats,
  type CombatLog,
  type EquipmentSlot,
  type ItemDefinition,
} from '@lov2/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { TravelQueueService } from './travel-queue.service.js';

@Injectable()
export class GameCommandsService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(NotificationsGateway) private readonly notifications: NotificationsGateway,
    @Inject(TravelQueueService) private readonly travelQueue: TravelQueueService,
  ) {}

  async bootstrap(userId: string): Promise<BootstrapState> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const character = await this.getCharacterForUser(userId);

    if (!user || !character) {
      return {
        user: user
          ? {
              id: user.id,
              email: user.email,
              displayName: user.displayName,
              createdAt: user.createdAt.toISOString(),
            }
          : null,
        character: null,
        races: gameData.races,
        items: gameData.items,
        quests: gameData.quests,
        locations: gameData.locations,
        enemies: gameData.enemies,
        scenes: gameData.scenes,
        inventory: [],
        questProgress: [],
        travels: [],
        combats: [],
      };
    }

    const [inventory, questProgress, travels, combats] = await Promise.all([
      this.prisma.inventoryStack.findMany({ where: { characterId: character.id } }),
      this.prisma.questProgress.findMany({ where: { characterId: character.id } }),
      this.prisma.travelTask.findMany({
        where: { characterId: character.id },
        orderBy: { startedAt: 'desc' },
        take: 10,
      }),
      this.prisma.combatEncounter.findMany({
        where: { characterId: character.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        createdAt: user.createdAt.toISOString(),
      },
      character: this.toCharacter(character),
      races: gameData.races,
      items: gameData.items,
      quests: gameData.quests,
      locations: gameData.locations,
      enemies: gameData.enemies,
      scenes: gameData.scenes,
      inventory: inventory.map((item) => {
        const mapped = {
          id: item.id,
          characterId: item.characterId,
          itemId: item.itemId,
          quantity: item.quantity,
        };
        return item.equippedSlot
          ? { ...mapped, equippedSlot: item.equippedSlot as EquipmentSlot }
          : mapped;
      }),
      questProgress: questProgress.map((quest) => ({
        id: quest.id,
        characterId: quest.characterId,
        questId: quest.questId,
        status: quest.status,
        progress: quest.progress,
        target: quest.target,
      })),
      travels: travels.map((travel) => {
        const mapped = {
          id: travel.id,
          characterId: travel.characterId,
          locationId: travel.locationId,
          status: travel.status,
          startedAt: travel.startedAt.toISOString(),
          completesAt: travel.completesAt.toISOString(),
        };
        return travel.questId ? { ...mapped, questId: travel.questId } : mapped;
      }),
      combats: combats.map((combat) => {
        const mapped = {
          id: combat.id,
          characterId: combat.characterId,
          enemyId: combat.enemyId,
          status: combat.status,
          createdAt: combat.createdAt.toISOString(),
        };
        const withQuest = combat.questId ? { ...mapped, questId: combat.questId } : mapped;
        return combat.log
          ? { ...withQuest, log: combat.log as unknown as CombatLog }
          : withQuest;
      }),
    };
  }

  async createCharacter(userId: string, input: { name: string; raceId: string }) {
    const race = gameData.races.find((entry) => entry.id === input.raceId);
    if (!race) {
      throw new BadRequestException('Неизвестная раса');
    }

    const existing = await this.prisma.character.findFirst({ where: { userId } });
    if (existing) {
      throw new ConflictException('У аккаунта уже есть персонаж');
    }

    const maxHealth = maxHealthForStats(race.baseStats, 1);
    const character = await this.prisma.character.create({
      data: {
        userId,
        name: input.name,
        raceId: race.id,
        stats: race.baseStats as unknown as Prisma.InputJsonObject,
        health: maxHealth,
        maxHealth,
        energy: DEFAULT_MAX_ENERGY,
        maxEnergy: DEFAULT_MAX_ENERGY,
        energyUpdatedAt: new Date(),
        inventory: {
          create: [{ itemId: 'duelist-rapier', quantity: 1, equippedSlot: 'weapon' }],
        },
        events: {
          create: {
            type: 'character.created',
            payload: { raceId: race.id },
          },
        },
      },
    });

    return this.bootstrap(userId);
  }

  async acceptQuest(userId: string, questId: string) {
    const character = await this.requireCharacter(userId);
    const quest = gameData.quests.find((entry) => entry.id === questId);
    if (!quest) {
      throw new NotFoundException('Квест не найден');
    }

    await this.prisma.questProgress.upsert({
      where: { characterId_questId: { characterId: character.id, questId } },
      update: { status: 'active', progress: 0, target: 1 },
      create: { characterId: character.id, questId, status: 'active', progress: 0, target: 1 },
    });
    await this.recordEvent(character.id, 'quest.updated', { questId, status: 'active' });

    return this.bootstrap(userId);
  }

  async startTravel(userId: string, input: { locationId: string; questId?: string }) {
    const character = await this.requireCharacter(userId);
    if (!input.questId) {
      throw new BadRequestException('Сначала примите квест в таверне');
    }

    const location = gameData.locations.find((entry) => entry.id === input.locationId);
    if (!location) {
      throw new NotFoundException('Локация не найдена');
    }

    const questDefinition = gameData.quests.find((entry) => entry.id === input.questId);
    if (!questDefinition || questDefinition.locationId !== location.id) {
      throw new BadRequestException('Маршрут не подходит для выбранного квеста');
    }

    const [quest, activeTravel, pendingCombat] = await Promise.all([
      this.prisma.questProgress.findUnique({
        where: { characterId_questId: { characterId: character.id, questId: input.questId } },
      }),
      this.prisma.travelTask.findFirst({
        where: { characterId: character.id, status: { in: ['traveling', 'arrived'] } },
      }),
      this.prisma.combatEncounter.findFirst({
        where: { characterId: character.id, status: 'pending' },
      }),
    ]);

    if (!quest || quest.status !== 'active') {
      throw new BadRequestException('Сначала примите квест в таверне');
    }
    if (activeTravel) {
      throw new ConflictException('Сначала завершите текущее путешествие');
    }
    if (pendingCombat) {
      throw new ConflictException('Сначала завершите ожидающий бой');
    }
    if (!hasEnoughEnergy(character.energy, questDefinition.energyCost)) {
      throw new BadRequestException('Недостаточно энергии для этого маршрута');
    }

    const startedAt = new Date();
    const completesAt = new Date(startedAt.getTime() + location.travelSeconds * 1000);
    const nextEnergy = spendEnergy(character.energy, questDefinition.energyCost);
    const travel = await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: {
          energy: nextEnergy,
          energyUpdatedAt: startedAt,
        },
      });

      const createdTravel = await tx.travelTask.create({
        data: {
          characterId: character.id,
          locationId: location.id,
          questId: input.questId,
          startedAt,
          completesAt,
        },
      });

      await tx.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'travel.started',
          payload: {
            locationId: location.id,
            questId: input.questId,
            energyCost: questDefinition.energyCost,
            energyLeft: nextEnergy,
          } as Prisma.InputJsonObject,
        },
      });

      return createdTravel;
    });
    await this.travelQueue.scheduleArrival(travel.id, completesAt);
    this.notifications.emitCharacterEvent(character.id, 'travel.started', {
      locationId: location.id,
      questId: input.questId,
    });

    return this.bootstrap(userId);
  }

  async claimTravel(userId: string, travelId: string) {
    const character = await this.requireCharacter(userId);
    const travel = await this.prisma.travelTask.findFirst({
      where: { id: travelId, characterId: character.id },
    });
    if (!travel) {
      throw new NotFoundException('Путешествие не найдено');
    }
    if (travel.completesAt > new Date()) {
      throw new BadRequestException('Путешествие еще не завершено');
    }
    if (travel.status === 'claimed') {
      throw new ConflictException('Путешествие уже получено');
    }

    const quest = travel.questId
      ? gameData.quests.find((entry) => entry.id === travel.questId)
      : gameData.quests.find((entry) => entry.locationId === travel.locationId);
    const enemyId = quest?.enemyId ?? 'mist-bandit';

    await this.prisma.$transaction([
      this.prisma.travelTask.update({ where: { id: travel.id }, data: { status: 'claimed' } }),
      this.prisma.combatEncounter.create({
        data: {
          characterId: character.id,
          questId: quest?.id ?? null,
          enemyId,
        },
      }),
      this.prisma.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'travel.completed',
          payload: { travelId, enemyId },
        },
      }),
    ]);

    this.notifications.emitCharacterEvent(character.id, 'travel.completed', { travelId, enemyId });
    return this.bootstrap(userId);
  }

  async resolveCombat(userId: string, combatId: string) {
    const character = await this.requireCharacter(userId);
    const combat = await this.prisma.combatEncounter.findFirst({
      where: { id: combatId, characterId: character.id },
    });
    if (!combat) {
      throw new NotFoundException('Бой не найден');
    }
    if (combat.status !== 'pending') {
      return this.bootstrap(userId);
    }

    const enemy = gameData.enemies.find((entry) => entry.id === combat.enemyId);
    if (!enemy) {
      throw new NotFoundException('Противник не найден');
    }

    const equipped = await this.prisma.inventoryStack.findMany({
      where: { characterId: character.id, equippedSlot: { not: null } },
    });
    const equippedDefinitions = equipped
      .map((entry) => gameData.items.find((item) => item.id === entry.itemId))
      .filter((item): item is ItemDefinition => item !== undefined);
    const effectiveStats = statsWithEquipment(
      character.stats as unknown as CharacterStats,
      equippedDefinitions,
    );
    const log = resolveCombatLog({
      characterStats: effectiveStats,
      characterLevel: character.level,
      characterHealth: character.health,
      enemy,
      reward: combat.questId
        ? (gameData.quests.find((quest) => quest.id === combat.questId)?.reward ?? enemy.reward)
        : enemy.reward,
    });
    const won = log.winner === 'character';
    const nextExperience = character.experience + log.reward.experience;
    const nextLevel = levelFromExperience(nextExperience);
    const levelGain = Math.max(0, nextLevel - character.level);
    const nextBaseStats = character.stats as unknown as CharacterStats;
    const nextMaxHealth = maxHealthForStats(nextBaseStats, nextLevel, character.rebirths);

    await this.prisma.$transaction(async (tx) => {
      await tx.combatEncounter.update({
        where: { id: combat.id },
        data: { status: won ? 'won' : 'lost', log: log as unknown as Prisma.InputJsonValue },
      });
      await tx.character.update({
        where: { id: character.id },
        data: {
          experience: nextExperience,
          level: nextLevel,
          unspentStatPoints: { increment: levelGain * 4 },
          gold: { increment: log.reward.gold },
          gems: { increment: log.reward.gems },
          health: won ? nextMaxHealth : Math.max(1, Math.floor(nextMaxHealth * 0.35)),
          maxHealth: nextMaxHealth,
        },
      });
      if (log.reward.gold !== 0) {
        await tx.currencyLedgerEntry.create({
          data: {
            characterId: character.id,
            currency: 'gold',
            amount: log.reward.gold,
            reason: `combat:${combat.id}`,
          },
        });
      }
      if (log.reward.gems !== 0) {
        await tx.currencyLedgerEntry.create({
          data: {
            characterId: character.id,
            currency: 'gems',
            amount: log.reward.gems,
            reason: `combat:${combat.id}`,
          },
        });
      }
      for (const itemId of log.reward.itemIds) {
        await tx.inventoryStack.upsert({
          where: { characterId_itemId: { characterId: character.id, itemId } },
          update: { quantity: { increment: 1 } },
          create: { characterId: character.id, itemId, quantity: 1 },
        });
      }
      if (won && combat.questId) {
        await tx.questProgress.update({
          where: { characterId_questId: { characterId: character.id, questId: combat.questId } },
          data: { status: 'completed', progress: 1 },
        });
      }
      await tx.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'combat.resolved',
          payload: { combatId: combat.id, won, reward: log.reward } as unknown as Prisma.InputJsonObject,
        },
      });
    });

    this.notifications.emitCharacterEvent(character.id, 'combat.resolved', { combatId, won });
    return this.bootstrap(userId);
  }

  async equipItem(userId: string, inventoryStackId: string) {
    const character = await this.requireCharacter(userId);
    const stack = await this.prisma.inventoryStack.findFirst({
      where: { id: inventoryStackId, characterId: character.id },
    });
    if (!stack) {
      throw new NotFoundException('Предмет не найден');
    }

    const item = gameData.items.find((entry) => entry.id === stack.itemId);
    if (!item?.slot) {
      throw new BadRequestException('Этот предмет нельзя экипировать');
    }

    await this.prisma.$transaction([
      this.prisma.inventoryStack.updateMany({
        where: { characterId: character.id, equippedSlot: item.slot },
        data: { equippedSlot: null },
      }),
      this.prisma.inventoryStack.update({
        where: { id: stack.id },
        data: { equippedSlot: item.slot },
      }),
      this.prisma.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'inventory.updated',
          payload: { equipped: stack.itemId, slot: item.slot },
        },
      }),
    ]);

    return this.bootstrap(userId);
  }

  async allocateStats(userId: string, input: { stat: keyof CharacterStats; points: number }) {
    const character = await this.requireCharacter(userId);
    if (character.unspentStatPoints < input.points) {
      throw new BadRequestException('Недостаточно очков характеристик');
    }
    const stats = { ...(character.stats as unknown as CharacterStats) };
    stats[input.stat] += input.points;
    const maxHealth = maxHealthForStats(stats, character.level, character.rebirths);

    await this.prisma.character.update({
      where: { id: character.id },
      data: {
        stats: stats as unknown as Prisma.InputJsonObject,
        maxHealth,
        health: maxHealth,
        unspentStatPoints: { decrement: input.points },
      },
    });

    return this.bootstrap(userId);
  }

  async refillEnergy(userId: string, input: { mode: 'gems' }) {
    const character = await this.requireCharacter(userId);
    if (input.mode !== 'gems') {
      throw new BadRequestException('Неизвестный способ пополнения энергии');
    }
    if (character.energy >= character.maxEnergy) {
      throw new ConflictException('Энергия уже заполнена');
    }
    if (character.gems < ENERGY_REFILL_GEMS_COST) {
      throw new BadRequestException('Недостаточно жемчужин для пополнения энергии');
    }

    const now = new Date();
    const nextEnergy = refillEnergyMeter(character.energy, character.maxEnergy);
    await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: {
          gems: { decrement: ENERGY_REFILL_GEMS_COST },
          energy: nextEnergy,
          energyUpdatedAt: now,
        },
      });
      await tx.currencyLedgerEntry.create({
        data: {
          characterId: character.id,
          currency: 'gems',
          amount: -ENERGY_REFILL_GEMS_COST,
          reason: 'energy:refill',
        },
      });
      await tx.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'energy.refilled',
          payload: {
            mode: input.mode,
            gemsSpent: ENERGY_REFILL_GEMS_COST,
            energy: nextEnergy,
          } as Prisma.InputJsonObject,
        },
      });
    });

    this.notifications.emitCharacterEvent(character.id, 'currency.updated', {
      currency: 'gems',
      amount: -ENERGY_REFILL_GEMS_COST,
    });
    this.notifications.emitCharacterEvent(character.id, 'energy.refilled', { energy: nextEnergy });
    return this.bootstrap(userId);
  }

  async startRebirth(userId: string) {
    const character = await this.requireCharacter(userId);
    if (!canRebirth(character.level)) {
      throw new BadRequestException('Перерождение открывается с 30 уровня');
    }

    const stats = rebirthStats(character.stats as unknown as CharacterStats, character.rebirths + 1);
    const maxHealth = maxHealthForStats(stats, 1, character.rebirths + 1);
    await this.prisma.character.update({
      where: { id: character.id },
      data: {
        level: 1,
        experience: 0,
        rebirths: { increment: 1 },
        stats: stats as unknown as Prisma.InputJsonObject,
        maxHealth,
        health: maxHealth,
        unspentStatPoints: 0,
      },
    });

    return this.bootstrap(userId);
  }

  private async getCharacterForUser(userId: string) {
    return this.prisma.character.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async requireCharacter(userId: string) {
    const character = await this.getCharacterForUser(userId);
    if (!character) {
      throw new BadRequestException('Сначала создайте персонажа');
    }
    return character;
  }

  private async recordEvent(characterId: string, type: string, payload: unknown) {
    await this.prisma.gameEvent.create({
      data: { characterId, type, payload: payload as Prisma.InputJsonValue },
    });
    this.notifications.emitCharacterEvent(characterId, type, payload);
  }

  private toCharacter(character: Awaited<ReturnType<GameCommandsService['requireCharacter']>>) {
    return {
      id: character.id,
      userId: character.userId,
      name: character.name,
      raceId: character.raceId,
      level: character.level,
      experience: character.experience,
      rebirths: character.rebirths,
      health: character.health,
      maxHealth: character.maxHealth,
      unspentStatPoints: character.unspentStatPoints,
      stats: character.stats as unknown as CharacterStats,
      gold: character.gold,
      gems: character.gems,
      energy: character.energy,
      maxEnergy: character.maxEnergy,
      energyUpdatedAt: character.energyUpdatedAt.toISOString(),
      createdAt: character.createdAt.toISOString(),
    };
  }
}
