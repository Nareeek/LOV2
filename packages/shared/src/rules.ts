import type { CharacterStats, CombatLog, EnemyDefinition, ItemDefinition, Reward } from './types.js';

export const DEFAULT_MAX_ENERGY = 30;
export const ENERGY_RESET_HOUR = 4;
export const ENERGY_REFILL_SMALL = 5;
export const ENERGY_REFILL_LARGE = 25;
export const ENERGY_REFILL_SMALL_GEMS_COST = 1;
export const ENERGY_REFILL_LARGE_GEMS_COST = 5;

export const ZERO_REWARD: Reward = {
  experience: 0,
  gold: 0,
  gems: 0,
  itemIds: [],
};

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
  return 80 + level * 14 + stats.сила * 6 + rebirths * 25;
}

export function mergeStats(base: CharacterStats, bonus: Partial<CharacterStats>): CharacterStats {
  return {
    сила: base.сила + (bonus.сила ?? 0),
    ловкость: base.ловкость + (bonus.ловкость ?? 0),
    интуиция: base.интуиция + (bonus.интуиция ?? 0),
    удача: base.удача + (bonus.удача ?? 0),
  };
}

export function itemStatsWithEnhancement(
  item: ItemDefinition,
  enhancementLevel = 0,
): Partial<CharacterStats> {
  const factor = Math.max(0, enhancementLevel);
  return {
    сила: (item.statBonus.сила ?? 0) + (item.statBonus.сила ? factor : 0),
    ловкость: (item.statBonus.ловкость ?? 0) + (item.statBonus.ловкость ? factor : 0),
    интуиция: (item.statBonus.интуиция ?? 0) + (item.statBonus.интуиция ? factor : 0),
    удача: (item.statBonus.удача ?? 0) + (item.statBonus.удача ? factor : 0),
  };
}

export function itemArmorWithEnhancement(item: ItemDefinition, enhancementLevel = 0): number {
  return Math.max(0, (item.armorBonus ?? 0) + Math.max(0, enhancementLevel) * ((item.armorBonus ?? 0) > 0 ? 2 : 0));
}

export function forgeUpgradeCost(item: ItemDefinition, enhancementLevel = 0): number {
  return Math.max(120, Math.floor(item.priceGold * 0.55) + Math.max(0, enhancementLevel) * 90);
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
  characterLevel: number;
  characterHealth: number;
  characterArmor?: number;
  enemy: EnemyDefinition;
  reward: Reward;
}): CombatLog {
  const turns = [];
  let characterHealth = params.characterHealth;
  let enemyHealth = params.enemy.health;
  let turn = 1;

  while (characterHealth > 0 && enemyHealth > 0 && turn <= 30) {
    const characterCrit = (params.characterStats.удача + turn * 3) % 11 === 0;
    const characterDamage = Math.max(
      1,
      Math.floor(
        params.characterStats.сила * 1.8 +
          params.characterStats.ловкость * 0.9 +
          params.characterStats.интуиция * 0.6 +
          params.characterLevel * 4 -
          params.enemy.armor * 0.35,
      ) * (characterCrit ? 2 : 1),
    );
    enemyHealth = Math.max(0, enemyHealth - characterDamage);
    turns.push({
      turn,
      actor: 'character' as const,
      damage: characterDamage,
      critical: characterCrit,
      targetHealth: enemyHealth,
    });

    if (enemyHealth <= 0) {
      break;
    }

    const enemyCrit = (params.enemy.stats.удача + turn * 5) % 13 === 0;
    const dodgeReduction =
      params.characterStats.ловкость > params.enemy.stats.интуиция ? params.characterStats.ловкость / 6 : 0;
    const enemyDamage = Math.max(
      1,
      Math.floor(
        params.enemy.stats.сила * 1.5 +
          params.enemy.stats.интуиция * 0.7 +
          params.enemy.level * 3 -
          dodgeReduction -
          (params.characterArmor ?? 0) * 0.32,
      ) * (enemyCrit ? 2 : 1),
    );
    characterHealth = Math.max(0, characterHealth - enemyDamage);
    turns.push({
      turn,
      actor: 'enemy' as const,
      damage: enemyDamage,
      critical: enemyCrit,
      targetHealth: characterHealth,
    });
    turn += 1;
  }

  const won = enemyHealth <= 0 || characterHealth >= enemyHealth;

  return {
    winner: won ? 'character' : 'enemy',
    turns,
    reward: won ? params.reward : ZERO_REWARD,
  };
}

export function canRebirth(level: number): boolean {
  return level >= 30;
}

export function rebirthStats(stats: CharacterStats, rebirths: number): CharacterStats {
  const bonus = 3 + rebirths;
  return {
    сила: 10 + bonus,
    ловкость: 10 + bonus,
    интуиция: 10 + bonus,
    удача: 10 + bonus,
  };
}
