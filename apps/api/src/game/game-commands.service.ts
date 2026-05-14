import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Character as DbCharacter, Prisma } from '@prisma/client';
import { gameData } from '@lov2/game-data';
import {
  BACKPACK_SLOT_COUNT,
  DEFAULT_MAX_ENERGY,
  ENERGY_REFILL_LARGE,
  ENERGY_REFILL_LARGE_GEMS_COST,
  ENERGY_REFILL_SMALL,
  ENERGY_REFILL_SMALL_GEMS_COST,
  armorFromEquipment,
  canRebirth,
  forgeUpgradeCost,
  hasBackpackCapacity,
  hasEnoughEnergy,
  isStandardShopItem,
  levelFromExperience,
  maxHealthForStats,
  refillEnergy as refillEnergyMeter,
  rebirthStats,
  resolveCombat as resolveCombatLog,
  scaleEnemyForEncounter,
  shouldResetDailyEnergy,
  spendEnergy,
  statAllocationGoldCost,
  statsWithEquipment,
  type BootstrapState,
  type CharacterClassId,
  type CharacterGender,
  type CharacterStats,
  type CombatLog,
  type CombatSource,
  type EnemyDefinition,
  type EquipmentSlot,
  type ItemDefinition,
  type PetCombatStats,
} from '@lov2/shared';
import { PrismaService } from '../prisma/prisma.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { TravelQueueService } from './travel-queue.service.js';

const CLASS_STAT_BONUSES: Record<CharacterClassId, Partial<CharacterStats>> = {
  swordsman: { сила: 7 },
  ranger: { ловкость: 7 },
  mage: { интуиция: 7 },
};

const STARTER_WEAPON_BY_CLASS: Record<CharacterClassId, string> = {
  swordsman: 'starter-sword',
  ranger: 'starter-bow',
  mage: 'starter-staff',
};

const PET_MAX_FOOD = 99;

const ENERGY_REFILL_OPTIONS = {
  cup: { amount: ENERGY_REFILL_SMALL, gems: ENERGY_REFILL_SMALL_GEMS_COST },
  bundle: { amount: ENERGY_REFILL_LARGE, gems: ENERGY_REFILL_LARGE_GEMS_COST },
} as const;

type EnergyRefillMode = keyof typeof ENERGY_REFILL_OPTIONS;

function validPetCombatStats(item: ItemDefinition): PetCombatStats | undefined {
  const stats = item.petCombatStats;

  if (
    !stats ||
    !Number.isSafeInteger(stats.level) ||
    stats.level <= 0 ||
    !Number.isSafeInteger(stats.health) ||
    stats.health <= 0
  ) {
    return undefined;
  }

  return stats;
}

function applyClassBonus(stats: CharacterStats, classId: CharacterClassId): CharacterStats {
  const bonus = CLASS_STAT_BONUSES[classId];
  return {
    сила: stats.сила + (bonus.сила ?? 0),
    ловкость: stats.ловкость + (bonus.ловкость ?? 0),
    интуиция: stats.интуиция + (bonus.интуиция ?? 0),
    удача: stats.удача + (bonus.удача ?? 0),
  };
}

function petDefinitions() {
  return gameData.items.filter((item) => item.slot === 'pet' && validPetCombatStats(item));
}

function petLevelFromExperience(baseLevel: number, experience: number): number {
  return baseLevel + Math.max(0, levelFromExperience(Math.max(0, experience)) - 1);
}

function characterBaseStats(character: Pick<DbCharacter, 'stats'>): CharacterStats {
  return character.stats as unknown as CharacterStats;
}

function arenaBandOffset(enemy: EnemyDefinition, characterLevel: number): number {
  if (!enemy.arenaBand) {
    return 0;
  }

  if (characterLevel < enemy.arenaBand.minLevel) {
    return Math.max(0, enemy.arenaBand.minLevel - characterLevel);
  }

  return Math.max(0, Math.floor((characterLevel - enemy.arenaBand.minLevel) / 10));
}

function scaledEnemyForCharacter(
  enemy: EnemyDefinition,
  character: Pick<DbCharacter, 'level' | 'stats'>,
  source: CombatSource = enemy.encounterKind,
): EnemyDefinition {
  return scaleEnemyForEncounter({
    template: enemy,
    playerLevel: character.level,
    playerStats: characterBaseStats(character),
    encounterKind: source === 'arena' ? 'arena' : 'travel',
    bandOffset: source === 'arena' ? arenaBandOffset(enemy, character.level) : 0,
  });
}

function enemyRosterForCharacter(character: Pick<DbCharacter, 'level' | 'stats'>): EnemyDefinition[] {
  return gameData.enemies.map((enemy) => scaledEnemyForCharacter(enemy, character, enemy.encounterKind));
}

function selectTravelEnemyId(locationId: string, character: Pick<DbCharacter, 'level'>): string {
  const candidates = gameData.enemies
    .filter((enemy) => enemy.encounterKind === 'travel' && enemy.locationIds?.includes(locationId))
    .sort((left, right) => left.id.localeCompare(right.id));

  if (candidates.length === 0) {
    return 'mist-bandit';
  }

  const index = Math.abs(character.level + locationId.length) % candidates.length;
  return candidates[index]?.id ?? candidates[0]!.id;
}

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
        petRoster: [],
        questProgress: [],
        travels: [],
        combats: [],
      };
    }

    const [inventory, petRoster, questProgress, travels, combats] = await Promise.all([
      this.prisma.inventoryStack.findMany({ where: { characterId: character.id } }),
      'characterPet' in this.prisma
        ? this.prisma.characterPet.findMany({ where: { characterId: character.id } })
        : Promise.resolve([]),
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
      enemies: enemyRosterForCharacter(character),
      scenes: gameData.scenes,
      inventory: inventory.map((item) => {
        const mapped = {
          id: item.id,
          characterId: item.characterId,
          itemId: item.itemId,
          quantity: item.quantity,
          enhancementLevel: item.enhancementLevel,
        };
        return item.equippedSlot
          ? { ...mapped, equippedSlot: item.equippedSlot as EquipmentSlot }
          : mapped;
      }),
      petRoster: petRoster.map((pet) => ({
        id: pet.id,
        characterId: pet.characterId,
        petId: pet.petId,
        food: pet.food,
        experience: pet.experience,
        createdAt: pet.createdAt.toISOString(),
        updatedAt: pet.updatedAt.toISOString(),
      })),
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
          source: (combat.source as CombatSource | undefined) ?? 'legacy',
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

  async createCharacter(
    userId: string,
    input: { name: string; raceId: string; gender: CharacterGender; classId: CharacterClassId },
  ) {
    const race = gameData.races.find((entry) => entry.id === input.raceId);
    if (!race) {
      throw new BadRequestException('Неизвестная раса');
    }
    if (!CLASS_STAT_BONUSES[input.classId]) {
      throw new BadRequestException('Неизвестный класс');
    }

    const existing = await this.prisma.character.findFirst({ where: { userId } });
    if (existing) {
      throw new ConflictException('У аккаунта уже есть персонаж');
    }

    const classedStats = applyClassBonus(race.baseStats, input.classId);
    const maxHealth = maxHealthForStats(classedStats, 1);
    const starterWeaponId = STARTER_WEAPON_BY_CLASS[input.classId];
    await this.prisma.character.create({
      data: {
        userId,
        name: input.name,
        raceId: race.id,
        gender: input.gender,
        classId: input.classId,
        stats: classedStats as unknown as Prisma.InputJsonObject,
        health: maxHealth,
        maxHealth,
        petFood: 10,
        energy: DEFAULT_MAX_ENERGY,
        maxEnergy: DEFAULT_MAX_ENERGY,
        energyUpdatedAt: new Date(),
        inventory: {
          create: [{ itemId: starterWeaponId, quantity: 1, equippedSlot: 'weapon' }],
        },
        pets: {
          create: petDefinitions().map((pet) => ({ petId: pet.id, food: 0, experience: 0 })),
        },
        events: {
          create: {
            type: 'character.created',
            payload: {
              raceId: race.id,
              gender: input.gender,
              classId: input.classId,
            } as Prisma.InputJsonObject,
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

    const existingProgress = await this.prisma.questProgress.findUnique({
      where: { characterId_questId: { characterId: character.id, questId } },
    });
    if (existingProgress?.status === 'active') {
      return this.bootstrap(userId);
    }

    if (existingProgress) {
      await this.prisma.questProgress.update({
        where: { characterId_questId: { characterId: character.id, questId } },
        data: { status: 'active', progress: 0, target: 1 },
      });
    } else {
      await this.prisma.questProgress.create({
        data: { characterId: character.id, questId, status: 'active', progress: 0, target: 1 },
      });
    }
    await this.recordEvent(character.id, 'quest.updated', { questId, status: 'active' });

    return this.bootstrap(userId);
  }

  async startTravel(userId: string, input: { locationId: string; questId?: string }) {
    const character = await this.requireCharacter(userId);
    if (!input.questId) {
      throw new BadRequestException('Сначала примите квест в таверне');
    }

    const questId = input.questId;

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
          questId,
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
            questId,
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
      questId,
    });

    return this.bootstrap(userId);
  }

  async claimTravel(userId: string, travelId: string, input: { rush?: boolean } = {}) {
    const character = await this.requireCharacter(userId);
    const travel = await this.prisma.travelTask.findFirst({
      where: { id: travelId, characterId: character.id },
    });
    if (!travel) {
      throw new NotFoundException('Путешествие не найдено');
    }

    const claimResult = await this.prisma.$transaction(async (tx) => {
      const currentTravel = await tx.travelTask.findFirst({
        where: { id: travelId, characterId: character.id },
      });
      if (!currentTravel) {
        throw new NotFoundException('Путешествие не найдено');
      }
      if (currentTravel.status === 'claimed') {
        return { claimed: false, enemyId: null };
      }

      const now = new Date();
      const rushCostGems = currentTravel.completesAt > now && input.rush ? 1 : 0;
      if (currentTravel.completesAt > now && !input.rush) {
        throw new BadRequestException('Путешествие еще не завершено');
      }

      const quest = currentTravel.questId
        ? gameData.quests.find((entry) => entry.id === currentTravel.questId)
        : undefined;
      if (currentTravel.questId && !quest) {
        throw new BadRequestException('Quest data is inconsistent');
      }
      const enemyId = quest?.enemyId ?? selectTravelEnemyId(currentTravel.locationId, character);
      const transition = await tx.travelTask.updateMany({
        where: {
          id: currentTravel.id,
          characterId: character.id,
          status: { in: ['traveling', 'arrived'] },
        },
        data: { status: 'claimed' },
      });
      if (transition.count === 0) {
        return { claimed: false, enemyId };
      }

      if (rushCostGems > 0) {
        const spent = await tx.character.updateMany({
          where: { id: character.id, gems: { gte: rushCostGems } },
          data: { gems: { decrement: rushCostGems } },
        });
        if (spent.count === 0) {
          throw new BadRequestException('Недостаточно жемчужин для ускорения');
        }
        await tx.currencyLedgerEntry.create({
          data: {
            characterId: character.id,
            currency: 'gems',
            amount: -rushCostGems,
            reason: 'travel.rush',
          },
        });
      }

      await tx.combatEncounter.create({
        data: {
          characterId: character.id,
          questId: quest ? currentTravel.questId : null,
          enemyId,
          source: 'travel',
        },
      });
      const payload = {
        travelId,
        enemyId,
        rushed: rushCostGems > 0,
        gemsSpent: rushCostGems,
        ...(currentTravel.questId ? { questId: currentTravel.questId } : {}),
      };
      await tx.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'travel.completed',
          payload: payload as Prisma.InputJsonObject,
        },
      });
      return { claimed: true, enemyId };
    });

    if (claimResult.claimed) {
      this.notifications.emitCharacterEvent(character.id, 'travel.completed', {
        travelId,
        enemyId: claimResult.enemyId,
      });
    }
    return this.bootstrap(userId);
  }

  async resolveCombat(userId: string, combatId: string, input: { petId?: string } = {}) {
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

    const enemyTemplate = gameData.enemies.find((entry) => entry.id === combat.enemyId);
    if (!enemyTemplate) {
      throw new NotFoundException('Противник не найден');
    }

    const questDefinition = combat.questId
      ? gameData.quests.find((quest) => quest.id === combat.questId)
      : undefined;
    if (combat.questId && !questDefinition) {
      throw new NotFoundException('Quest not found');
    }
    const combatSource = (combat.source as CombatSource | undefined) ?? 'legacy';
    const enemy = scaledEnemyForCharacter(enemyTemplate, character, combatSource);

    const equipped = await this.prisma.inventoryStack.findMany({
      where: { characterId: character.id, equippedSlot: { not: null } },
    });
    const equippedDefinitions: Array<{ definition: ItemDefinition; enhancementLevel: number }> =
      equipped.flatMap((entry) => {
        const definition = gameData.items.find((item) => item.id === entry.itemId);

        if (!definition) {
          return [];
        }

        return [{ definition, enhancementLevel: entry.enhancementLevel }];
      });
    const requestedEquippedPet = input.petId
      ? equipped.find(
          (entry) =>
            entry.characterId === character.id &&
            entry.itemId === input.petId &&
            entry.equippedSlot === 'pet',
        )
      : undefined;
    const verifiedPetRoster = input.petId && 'characterPet' in this.prisma
      ? await this.prisma.characterPet.findUnique({
          where: { characterId_petId: { characterId: character.id, petId: input.petId } },
        })
      : undefined;
    const fallbackEquippedPet = !('characterPet' in this.prisma) && input.petId
      ? equipped.find(
          (entry) =>
            entry.characterId === character.id &&
            entry.itemId === input.petId &&
            entry.equippedSlot === 'pet',
        )
      : undefined;
    const verifiedPetDefinition = verifiedPetRoster && verifiedPetRoster.food > 0 && requestedEquippedPet
      ? gameData.items.find((item) => item.id === verifiedPetRoster.petId && item.slot === 'pet')
      : fallbackEquippedPet
        ? gameData.items.find((item) => item.id === fallbackEquippedPet.itemId && item.slot === 'pet')
        : undefined;
    const verifiedPetCombatStats = verifiedPetDefinition
      ? validPetCombatStats(verifiedPetDefinition)
      : undefined;
    const effectiveStats = statsWithEquipment(
      character.stats as unknown as CharacterStats,
      equippedDefinitions,
    );
    const effectiveArmor = armorFromEquipment(equippedDefinitions);
    const log = resolveCombatLog({
      characterStats: effectiveStats,
      characterClassId: character.classId as CharacterClassId,
      characterLevel: character.level,
      characterHealth: character.health,
      characterArmor: effectiveArmor,
      enemy,
      reward: questDefinition?.reward ?? enemy.reward,
      ...(verifiedPetDefinition && verifiedPetCombatStats
        ? {
            pet: {
              id: verifiedPetDefinition.id,
              level: petLevelFromExperience(verifiedPetCombatStats.level, verifiedPetRoster?.experience ?? 0),
              health: verifiedPetCombatStats.health,
              food: verifiedPetRoster?.food ?? 1,
              experience: verifiedPetRoster?.experience ?? 0,
            },
          }
        : {}),
    });
    const won = log.winner === 'character';
    const now = new Date();
    const nextExperience = character.experience + log.reward.experience;
    const nextLevel = levelFromExperience(nextExperience);
    const levelGain = Math.max(0, nextLevel - character.level);
    const leveledUp = levelGain > 0;
    const nextBaseStats = character.stats as unknown as CharacterStats;
    const nextMaxHealth = maxHealthForStats(nextBaseStats, nextLevel, character.rebirths);

    const resolved = await this.prisma.$transaction(async (tx) => {
      const transition = await tx.combatEncounter.updateMany({
        where: { id: combat.id, characterId: character.id, status: 'pending' },
        data: { status: won ? 'won' : 'lost', log: log as unknown as Prisma.InputJsonValue },
      });
      if (transition.count === 0) {
        return false;
      }

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
          maxEnergy: DEFAULT_MAX_ENERGY,
          ...(leveledUp
            ? {
                energy: DEFAULT_MAX_ENERGY,
                energyUpdatedAt: now,
              }
            : {}),
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
        await tx.inventoryStack.create({
          data: { characterId: character.id, itemId, quantity: 1 },
        });
      }
      if (verifiedPetRoster && (log.petFoodSpent ?? 0) > 0) {
        await tx.characterPet.update({
          where: { characterId_petId: { characterId: character.id, petId: verifiedPetRoster.petId } },
          data: {
            food: { decrement: log.petFoodSpent ?? 0 },
            experience: { increment: log.petExperienceGained ?? 0 },
          },
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
          payload: {
            combatId: combat.id,
            won,
            reward: log.reward,
            leveledUp,
            source: combatSource,
            petFoodSpent: log.petFoodSpent ?? 0,
            petExperienceGained: log.petExperienceGained ?? 0,
          } as unknown as Prisma.InputJsonObject,
        },
      });
      return true;
    });

    if (resolved) {
      this.notifications.emitCharacterEvent(character.id, 'combat.resolved', { combatId, won });
    }
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

  async unequipItem(userId: string, inventoryStackId: string) {
    const character = await this.requireCharacter(userId);
    const stack = await this.prisma.inventoryStack.findFirst({
      where: { id: inventoryStackId, characterId: character.id },
    });
    if (!stack) {
      throw new NotFoundException('Предмет не найден');
    }
    if (!stack.equippedSlot) {
      throw new ConflictException('Предмет уже снят');
    }

    await this.prisma.$transaction([
      this.prisma.inventoryStack.update({
        where: { id: stack.id },
        data: { equippedSlot: null },
      }),
      this.prisma.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'inventory.updated',
          payload: { unequipped: stack.itemId, slot: stack.equippedSlot },
        },
      }),
    ]);

    return this.bootstrap(userId);
  }

  async allocateStats(userId: string, input: { stat: keyof CharacterStats; points: number }) {
    const character = await this.requireCharacter(userId);
    const points = Math.max(1, input.points);
    const stats = { ...(character.stats as unknown as CharacterStats) };
    const cost = statAllocationGoldCost(stats[input.stat], points);
    if (character.gold < cost) {
      throw new BadRequestException('Недостаточно золота для повышения характеристики');
    }
    stats[input.stat] += points;
    const maxHealth = maxHealthForStats(stats, character.level, character.rebirths);

    await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: {
          stats: stats as unknown as Prisma.InputJsonObject,
          maxHealth,
          health: maxHealth,
          gold: { decrement: cost },
        },
      });
      await tx.currencyLedgerEntry.create({
        data: {
          characterId: character.id,
          currency: 'gold',
          amount: -cost,
          reason: `stat:${String(input.stat)}`,
        },
      });
    });

    return this.bootstrap(userId);
  }

  async refillEnergy(userId: string, input: { mode: EnergyRefillMode }) {
    const character = await this.requireCharacter(userId);
    const option = ENERGY_REFILL_OPTIONS[input.mode];
    if (!option) {
      throw new BadRequestException('Неизвестный способ пополнения энергии');
    }
    if (character.energy >= character.maxEnergy) {
      throw new ConflictException('Энергия уже заполнена');
    }
    if (character.gems < option.gems) {
      throw new BadRequestException('Недостаточно жемчужин для пополнения энергии');
    }

    const now = new Date();
    const nextEnergy = refillEnergyMeter(character.energy, character.maxEnergy, option.amount);
    await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: {
          gems: { decrement: option.gems },
          energy: nextEnergy,
          energyUpdatedAt: now,
        },
      });
      await tx.currencyLedgerEntry.create({
        data: {
          characterId: character.id,
          currency: 'gems',
          amount: -option.gems,
          reason: `energy:${input.mode}`,
        },
      });
      await tx.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'energy.refilled',
          payload: {
            mode: input.mode,
            gemsSpent: option.gems,
            energyAdded: option.amount,
            energy: nextEnergy,
          } as Prisma.InputJsonObject,
        },
      });
    });

    this.notifications.emitCharacterEvent(character.id, 'currency.updated', {
      currency: 'gems',
      amount: -option.gems,
    });
    this.notifications.emitCharacterEvent(character.id, 'energy.refilled', { energy: nextEnergy });
    return this.bootstrap(userId);
  }

  async feedPet(userId: string, petId: string, input: { amount: 1 | 10 }) {
    const character = await this.requireCharacter(userId);
    const requestedAmount = input.amount === 10 ? 10 : 1;
    const pet = await this.prisma.characterPet.findUnique({
      where: { characterId_petId: { characterId: character.id, petId } },
    });
    if (!pet || !gameData.items.some((item) => item.id === petId && item.slot === 'pet')) {
      throw new NotFoundException('Питомец не найден');
    }

    const room = Math.max(0, PET_MAX_FOOD - pet.food);
    const amount = Math.min(requestedAmount, room, character.petFood);
    if (amount < 1) {
      return this.bootstrap(userId);
    }

    await this.prisma.$transaction(async (tx) => {
      const spent = await tx.character.updateMany({
        where: { id: character.id, petFood: { gte: amount } },
        data: { petFood: { decrement: amount } },
      });
      if (spent.count === 0) {
        throw new BadRequestException('Недостаточно еды для питомца');
      }
      await tx.characterPet.update({
        where: { characterId_petId: { characterId: character.id, petId } },
        data: { food: { increment: amount } },
      });
      await tx.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'pet.fed',
          payload: { petId, amount } as Prisma.InputJsonObject,
        },
      });
    });

    return this.bootstrap(userId);
  }

  async purchaseItem(userId: string, input: { itemId: string }) {
    const character = await this.requireCharacter(userId);
    const item = gameData.items.find((entry) => entry.id === input.itemId);
    if (!item) {
      throw new NotFoundException('Предмет не найден');
    }
    if (!isStandardShopItem(item, character.classId as CharacterClassId)) {
      throw new BadRequestException('Этот товар не продаётся в обычном магазине');
    }

    const priceGems = item.priceGems ?? 0;
    const currency = priceGems > 0 ? 'gems' : 'gold';
    const amount = priceGems > 0 ? priceGems : item.priceGold;

    if (currency === 'gems' && character.gems < amount) {
      throw new BadRequestException('Недостаточно жемчужин для покупки');
    }
    if (currency === 'gold' && character.gold < amount) {
      throw new BadRequestException('Недостаточно золота для покупки');
    }

    await this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventoryStack.findMany({
        where: { characterId: character.id },
        select: { equippedSlot: true },
      });
      if (!hasBackpackCapacity(inventory, BACKPACK_SLOT_COUNT)) {
        throw new BadRequestException('Рюкзак полон');
      }

      await tx.character.update({
        where: { id: character.id },
        data: currency === 'gems' ? { gems: { decrement: amount } } : { gold: { decrement: amount } },
      });
      await tx.inventoryStack.create({
        data: { characterId: character.id, itemId: item.id, quantity: 1 },
      });
      await tx.currencyLedgerEntry.create({
        data: {
          characterId: character.id,
          currency,
          amount: -amount,
          reason: `shop:${item.id}`,
        },
      });
      await tx.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'inventory.updated',
          payload: {
            action: 'purchase',
            itemId: item.id,
            currency,
            amount,
          } as Prisma.InputJsonObject,
        },
      });
    });

    return this.bootstrap(userId);
  }

  async upgradeItem(userId: string, input: { inventoryStackId: string }) {
    const character = await this.requireCharacter(userId);
    const stack = await this.prisma.inventoryStack.findFirst({
      where: { id: input.inventoryStackId, characterId: character.id },
    });
    if (!stack) {
      throw new NotFoundException('Предмет не найден');
    }

    const item = gameData.items.find((entry) => entry.id === stack.itemId);
    if (!item?.forgeable || !item.slot || item.slot === 'pet') {
      throw new BadRequestException('Этот предмет пока нельзя улучшить в кузнице');
    }

    const cost = forgeUpgradeCost(item, stack.enhancementLevel);
    if (character.gold < cost) {
      throw new BadRequestException('Недостаточно золота для улучшения');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.character.update({
        where: { id: character.id },
        data: { gold: { decrement: cost } },
      });
      await tx.inventoryStack.update({
        where: { id: stack.id },
        data: { enhancementLevel: { increment: 1 } },
      });
      await tx.currencyLedgerEntry.create({
        data: {
          characterId: character.id,
          currency: 'gold',
          amount: -cost,
          reason: `forge:${stack.id}`,
        },
      });
      await tx.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'inventory.updated',
          payload: {
            action: 'forge-upgrade',
            inventoryStackId: stack.id,
            itemId: item.id,
            cost,
          } as Prisma.InputJsonObject,
        },
      });
    });

    return this.bootstrap(userId);
  }

  async startArena(userId: string, input: { enemyId: string }) {
    const character = await this.requireCharacter(userId);
    const enemy = gameData.enemies.find((entry) => entry.id === input.enemyId);
    if (!enemy || enemy.encounterKind !== 'arena') {
      throw new NotFoundException('Соперник не найден');
    }

    const [activeTravel, pendingCombat] = await Promise.all([
      this.prisma.travelTask.findFirst({
        where: { characterId: character.id, status: { in: ['traveling', 'arrived'] } },
      }),
      this.prisma.combatEncounter.findFirst({
        where: { characterId: character.id, status: 'pending' },
      }),
    ]);
    if (activeTravel) {
      throw new ConflictException('Сначала завершите текущее путешествие');
    }
    if (pendingCombat) {
      throw new ConflictException('Сначала завершите текущий бой');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.combatEncounter.create({
        data: {
          characterId: character.id,
          enemyId: enemy.id,
          source: 'arena',
        },
      });
      await tx.gameEvent.create({
        data: {
          characterId: character.id,
          type: 'combat.started',
          payload: { source: 'arena', enemyId: enemy.id } as Prisma.InputJsonObject,
        },
      });
    });

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
        maxEnergy: DEFAULT_MAX_ENERGY,
        energy: DEFAULT_MAX_ENERGY,
        energyUpdatedAt: new Date(),
        unspentStatPoints: 0,
      },
    });

    return this.bootstrap(userId);
  }

  private async getCharacterForUser(userId: string) {
    const character = await this.prisma.character.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return character ? this.syncCharacterEnergy(character) : null;
  }

  private async requireCharacter(userId: string) {
    const character = await this.getCharacterForUser(userId);
    if (!character) {
      throw new BadRequestException('Сначала создайте персонажа');
    }
    return character;
  }

  private async syncCharacterEnergy(character: DbCharacter) {
    const now = new Date();
    const needsReset = shouldResetDailyEnergy(character.energyUpdatedAt, now);
    const needsCapSync = character.maxEnergy !== DEFAULT_MAX_ENERGY;
    const needsClamp = character.energy > DEFAULT_MAX_ENERGY;

    if (!needsReset && !needsCapSync && !needsClamp) {
      return character;
    }

    return this.prisma.character.update({
      where: { id: character.id },
      data: {
        maxEnergy: DEFAULT_MAX_ENERGY,
        energy: needsReset || needsCapSync ? DEFAULT_MAX_ENERGY : Math.min(character.energy, DEFAULT_MAX_ENERGY),
        energyUpdatedAt: needsReset || needsCapSync ? now : character.energyUpdatedAt,
      },
    });
  }

  private async recordEvent(characterId: string, type: string, payload: unknown) {
    await this.prisma.gameEvent.create({
      data: { characterId, type, payload: payload as Prisma.InputJsonValue },
    });
    this.notifications.emitCharacterEvent(characterId, type, payload);
  }

  private toCharacter(character: DbCharacter) {
    return {
      id: character.id,
      userId: character.userId,
      name: character.name,
      raceId: character.raceId,
      gender: character.gender as CharacterGender,
      classId: character.classId as CharacterClassId,
      level: character.level,
      experience: character.experience,
      rebirths: character.rebirths,
      health: character.health,
      maxHealth: character.maxHealth,
      unspentStatPoints: character.unspentStatPoints,
      stats: character.stats as unknown as CharacterStats,
      gold: character.gold,
      gems: character.gems,
      petFood: character.petFood,
      energy: character.energy,
      maxEnergy: character.maxEnergy,
      energyUpdatedAt: character.energyUpdatedAt.toISOString(),
      createdAt: character.createdAt.toISOString(),
    };
  }
}
