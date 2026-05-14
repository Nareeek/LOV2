import type {
  CharacterClassId,
  CharacterStats,
  CombatLog,
  EnemyDefinition,
  ItemDefinition,
  PetCombatStats,
  Reward,
  StatKey,
} from './types.js';

export const DEFAULT_MAX_ENERGY = 30;
export const ENERGY_RESET_HOUR = 4;
export const ENERGY_REFILL_SMALL = 5;
export const ENERGY_REFILL_LARGE = 25;
export const ENERGY_REFILL_SMALL_GEMS_COST = 1;
export const ENERGY_REFILL_LARGE_GEMS_COST = 5;

export const STAT_STRENGTH = '\u0441\u0438\u043b\u0430' as StatKey;
export const STAT_AGILITY = '\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c' as StatKey;
export const STAT_INTUITION = '\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f' as StatKey;
export const STAT_LUCK = '\u0443\u0434\u0430\u0447\u0430' as StatKey;

export const ZERO_REWARD: Reward = {
  experience: 0,
  gold: 0,
  gems: 0,
  itemIds: [],
};

export function primaryDamageStatForClass(classId: CharacterClassId): StatKey {
  switch (classId) {
    case 'ranger':
      return STAT_AGILITY;
    case 'mage':
      return STAT_INTUITION;
    case 'swordsman':
    default:
      return STAT_STRENGTH;
  }
}

export function damageRangeForClass(
  stats: CharacterStats,
  classId: CharacterClassId,
  level = 1,
): { min: number; max: number; primaryStat: StatKey } {
  const primaryStat = primaryDamageStatForClass(classId);
  const primary = stats[primaryStat] ?? 0;
  const luck = stats[STAT_LUCK] ?? 0;
  const min = Math.max(1, Math.round(primary * 2.2 + level * 1.2 + luck * 0.25));
  const max = Math.max(min + 1, Math.round(primary * 3.2 + level * 1.6 + luck * 0.38));

  return { min, max, primaryStat };
}

export function hasEnoughEnergy(currentEnergy: number, energyCost: number): boolean {
  return currentEnergy >= Math.max(0, energyCost);
}

export function spendEnergy(currentEnergy: number, energyCost: number): number {
  if (!hasEnoughEnergy(currentEnergy, energyCost)) {
    throw new Error('insufficient energy');
  }

  return Math.max(0, currentEnergy - Math.max(0, energyCost));
}

export function refillEnergy(currentEnergy: number, maxEnergy: number, amount = maxEnergy): number {
  return Math.min(Math.max(0, maxEnergy), Math.max(0, currentEnergy) + Math.max(0, amount));
}

export function getDailyEnergyResetBoundary(date: Date, resetHour = ENERGY_RESET_HOUR): Date {
  const boundary = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    resetHour,
    0,
    0,
    0,
  );

  if (date.getTime() < boundary.getTime()) {
    boundary.setDate(boundary.getDate() - 1);
  }

  return boundary;
}

export function shouldResetDailyEnergy(lastUpdatedAt: Date, now: Date, resetHour = ENERGY_RESET_HOUR): boolean {
  return getDailyEnergyResetBoundary(now, resetHour).getTime() >
    getDailyEnergyResetBoundary(lastUpdatedAt, resetHour).getTime();
}

export function experienceForLevel(level: number): number {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error('level must be a positive integer');
  }

  return Math.floor(100 * level ** 2.15);
}

export function levelFromExperience(experience: number): number {
  if (experience < 0) {
    throw new Error('experience must not be negative');
  }

  let level = 1;
  while (experience >= experienceForLevel(level + 1)) {
    level += 1;
  }

  return level;
}

export function maxHealthForStats(stats: CharacterStats, level: number, rebirths = 0): number {
  return 80 + level * 14 + stats[STAT_STRENGTH] * 6 + rebirths * 25;
}

export function mergeStats(base: CharacterStats, bonus: Partial<CharacterStats>): CharacterStats {
  return {
    [STAT_STRENGTH]: base[STAT_STRENGTH] + (bonus[STAT_STRENGTH] ?? 0),
    [STAT_AGILITY]: base[STAT_AGILITY] + (bonus[STAT_AGILITY] ?? 0),
    [STAT_INTUITION]: base[STAT_INTUITION] + (bonus[STAT_INTUITION] ?? 0),
    [STAT_LUCK]: base[STAT_LUCK] + (bonus[STAT_LUCK] ?? 0),
  } as unknown as CharacterStats;
}

export function itemStatsWithEnhancement(
  item: ItemDefinition,
  enhancementLevel = 0,
): Partial<CharacterStats> {
  const factor = Math.max(0, enhancementLevel);
  return {
    [STAT_STRENGTH]: (item.statBonus[STAT_STRENGTH] ?? 0) + (item.statBonus[STAT_STRENGTH] ? factor : 0),
    [STAT_AGILITY]: (item.statBonus[STAT_AGILITY] ?? 0) + (item.statBonus[STAT_AGILITY] ? factor : 0),
    [STAT_INTUITION]: (item.statBonus[STAT_INTUITION] ?? 0) + (item.statBonus[STAT_INTUITION] ? factor : 0),
    [STAT_LUCK]: (item.statBonus[STAT_LUCK] ?? 0) + (item.statBonus[STAT_LUCK] ? factor : 0),
  };
}

export function itemArmorWithEnhancement(item: ItemDefinition, enhancementLevel = 0): number {
  return Math.max(0, (item.armorBonus ?? 0) + Math.max(0, enhancementLevel) * ((item.armorBonus ?? 0) > 0 ? 2 : 0));
}

export function forgeUpgradeCost(item: ItemDefinition, enhancementLevel = 0): number {
  return Math.max(120, Math.floor(item.priceGold * 0.55) + Math.max(0, enhancementLevel) * 90);
}

export function statAllocationGoldCost(currentStatValue: number, points = 1): number {
  let cost = 0;
  for (let point = 0; point < Math.max(0, points); point += 1) {
    cost += 25 + (Math.max(0, currentStatValue) + point) * 5;
  }
  return cost;
}

export function statsWithEquipment(
  base: CharacterStats,
  items: Array<ItemDefinition | { definition: ItemDefinition; enhancementLevel?: number }>,
): CharacterStats {
  return items.reduce((stats, entry) => {
    const definition = 'definition' in entry ? entry.definition : entry;
    const enhancementLevel = 'definition' in entry ? entry.enhancementLevel ?? 0 : 0;
    return mergeStats(stats, itemStatsWithEnhancement(definition, enhancementLevel));
  }, base);
}

export function armorFromEquipment(
  items: Array<ItemDefinition | { definition: ItemDefinition; enhancementLevel?: number }>,
): number {
  return items.reduce((total, entry) => {
    const definition = 'definition' in entry ? entry.definition : entry;
    const enhancementLevel = 'definition' in entry ? entry.enhancementLevel ?? 0 : 0;
    return total + itemArmorWithEnhancement(definition, enhancementLevel);
  }, 0);
}

export function resolveCombat(params: {
  characterStats: CharacterStats;
  characterClassId?: CharacterClassId;
  characterLevel: number;
  characterHealth: number;
  characterArmor?: number;
  enemy: EnemyDefinition;
  reward: Reward;
  pet?: PetCombatStats & {
    id?: string;
    food?: number;
    experience?: number;
  };
}): CombatLog {
  const turns = [];
  let characterHealth = params.characterHealth;
  let enemyHealth = params.enemy.health;
  let petHealth = params.pet?.health ?? 0;
  const petFood = Math.max(0, Math.floor(params.pet?.food ?? (params.pet ? 1 : 0)));
  let petTurns = 0;
  let turn = 1;
  let allyTurn: 'character' | 'pet' = params.pet && petFood > 0 ? 'pet' : 'character';
  let allyHitCount = 0;
  let enemyHitCount = 0;
  let lastAllyDamage = 0;
  let lastEnemyDamage = 0;
  const primaryDamageStat = primaryDamageStatForClass(params.characterClassId ?? 'swordsman');
  const offDamageStats = [STAT_STRENGTH, STAT_AGILITY, STAT_INTUITION].filter(
    (statKey) => statKey !== primaryDamageStat,
  );
  const stat = (stats: CharacterStats, key: keyof CharacterStats) => stats[key] ?? 0;
  const characterInitiative =
    (stat(params.characterStats, STAT_LUCK) * 7 + stat(params.characterStats, STAT_AGILITY) * 3 + params.characterLevel * 5 + 17) % 100;
  const enemyInitiative =
    (stat(params.enemy.stats, STAT_LUCK) * 7 + stat(params.enemy.stats, STAT_AGILITY) * 3 + params.enemy.level * 5) % 100;
  let nextSide: 'character' | 'enemy' = characterInitiative >= enemyInitiative ? 'character' : 'enemy';

  while (characterHealth > 0 && enemyHealth > 0 && turn <= 30) {
    if (nextSide === 'character') {
      const isPetTurn: boolean = allyTurn === 'pet' && petHealth > 0 && petFood > 0;
      const critical = isPetTurn
        ? (stat(params.characterStats, STAT_LUCK) + (params.pet?.level ?? 1) + turn * 2) % 12 === 0
        : (stat(params.characterStats, STAT_LUCK) + turn * 3) % 11 === 0;
      const baseDamage = isPetTurn
        ? (params.pet?.level ?? 1) * 2.1 + stat(params.characterStats, STAT_INTUITION) * 0.45
        : stat(params.characterStats, primaryDamageStat) * 1.8 +
          stat(params.characterStats, offDamageStats[0]!) * 0.9 +
          stat(params.characterStats, offDamageStats[1]!) * 0.6 +
          params.characterLevel * 4 -
          params.enemy.armor * 0.35;
      allyHitCount += 1;
      const luckySurge = critical ? 1.65 + stat(params.characterStats, STAT_LUCK) / 100 : 1;
      const ramp = 1 + allyHitCount * 0.08 + stat(params.characterStats, STAT_LUCK) / 280;
      const damage = Math.max(lastAllyDamage, Math.max(1, Math.floor(baseDamage * ramp * luckySurge)));
      lastAllyDamage = damage;
      enemyHealth = Math.max(0, enemyHealth - damage);
      if (isPetTurn) {
        petTurns += 1;
      }
      turns.push({
        turn,
        actor: isPetTurn ? 'pet' as const : 'character' as const,
        target: 'enemy' as const,
        damage,
        critical,
        targetHealth: enemyHealth,
      });
      allyTurn = !isPetTurn && params.pet && petHealth > 0 && petFood > 0 ? 'pet' : 'character';
      nextSide = 'enemy';
      continue;
    }

    const target = params.pet && allyTurn === 'character' && petHealth > 0 ? 'pet' as const : 'character' as const;
    const enemyCrit = (stat(params.enemy.stats, STAT_LUCK) + turn * 5) % 13 === 0;
    const dodgeReduction =
      target === 'character' && stat(params.characterStats, STAT_AGILITY) > stat(params.enemy.stats, STAT_INTUITION)
        ? stat(params.characterStats, STAT_AGILITY) / 6
        : 0;
    const armorReduction = target === 'character' ? (params.characterArmor ?? 0) * 0.32 : 0;
    enemyHitCount += 1;
    const enemyBaseDamage =
      stat(params.enemy.stats, STAT_STRENGTH) * 1.5 +
      stat(params.enemy.stats, STAT_INTUITION) * 0.7 +
      params.enemy.level * 3 -
      dodgeReduction -
      armorReduction;
    const enemyLuckySurge = enemyCrit ? 1.65 + stat(params.enemy.stats, STAT_LUCK) / 100 : 1;
    const enemyRamp = 1 + enemyHitCount * 0.08 + stat(params.enemy.stats, STAT_LUCK) / 280;
    const enemyDamage = Math.max(lastEnemyDamage, Math.max(1, Math.floor(enemyBaseDamage * enemyRamp * enemyLuckySurge)));
    lastEnemyDamage = enemyDamage;
    if (target === 'pet') {
      petHealth = Math.max(0, petHealth - enemyDamage);
      turns.push({ turn, actor: 'enemy' as const, target, damage: enemyDamage, critical: enemyCrit, targetHealth: petHealth });
    } else {
      characterHealth = Math.max(0, characterHealth - enemyDamage);
      turns.push({ turn, actor: 'enemy' as const, target, damage: enemyDamage, critical: enemyCrit, targetHealth: characterHealth });
    }
    nextSide = 'character';
    turn += 1;
  }

  const won = enemyHealth <= 0 || characterHealth >= enemyHealth;
  const petFoodSpent = petTurns > 0 ? 1 : 0;
  const petExperienceGained = petTurns > 0 && won ? 1 : 0;

  return {
    winner: won ? 'character' : 'enemy',
    turns,
    reward: won ? params.reward : ZERO_REWARD,
    ...(params.pet?.id ? { petId: params.pet.id } : {}),
    ...(petFoodSpent > 0 ? { petFoodSpent } : {}),
    ...(petExperienceGained > 0 ? { petExperienceGained, petTurns } : {}),
  };
}

export function canRebirth(level: number): boolean {
  return level >= 30;
}

export function rebirthStats(stats: CharacterStats, rebirths: number): CharacterStats {
  const bonus = 3 + rebirths;
  return {
    [STAT_STRENGTH]: 10 + bonus,
    [STAT_AGILITY]: 10 + bonus,
    [STAT_INTUITION]: 10 + bonus,
    [STAT_LUCK]: 10 + bonus,
  } as unknown as CharacterStats;
}
