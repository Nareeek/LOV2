import type { CharacterStats, CombatLog, EnemyDefinition, ItemDefinition, PetCombatStats, Reward } from './types.js';

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
  characterLevel: number;
  characterHealth: number;
  characterArmor?: number;
  enemy: EnemyDefinition;
  reward: Reward;
  pet?: PetCombatStats & {
    id?: string;
  };
}): CombatLog {
  const turns = [];
  let characterHealth = params.characterHealth;
  let enemyHealth = params.enemy.health;
  let petHealth = params.pet?.health ?? 0;
  let turn = 1;
  let allyTurn: 'character' | 'pet' = 'character';
  let allyHitCount = 0;
  let enemyHitCount = 0;
  let lastAllyDamage = 0;
  let lastEnemyDamage = 0;
  const strength = '\u0441\u0438\u043b\u0430' as keyof CharacterStats;
  const agility = '\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c' as keyof CharacterStats;
  const intuition = '\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f' as keyof CharacterStats;
  const luck = '\u0443\u0434\u0430\u0447\u0430' as keyof CharacterStats;
  const stat = (stats: CharacterStats, key: keyof CharacterStats) => stats[key] ?? 0;
  const characterInitiative =
    (stat(params.characterStats, luck) * 7 + stat(params.characterStats, agility) * 3 + params.characterLevel * 5 + 17) % 100;
  const enemyInitiative = (stat(params.enemy.stats, luck) * 7 + stat(params.enemy.stats, agility) * 3 + params.enemy.level * 5) % 100;
  let nextSide: 'character' | 'enemy' = characterInitiative >= enemyInitiative ? 'character' : 'enemy';

  while (characterHealth > 0 && enemyHealth > 0 && turn <= 30) {
    if (nextSide === 'character') {
      const isPetTurn: boolean = allyTurn === 'pet' && petHealth > 0;
      const critical = isPetTurn
        ? (stat(params.characterStats, luck) + (params.pet?.level ?? 1) + turn * 2) % 12 === 0
        : (stat(params.characterStats, luck) + turn * 3) % 11 === 0;
      const baseDamage = isPetTurn
        ? (params.pet?.level ?? 1) * 2.1 + stat(params.characterStats, intuition) * 0.45
        : stat(params.characterStats, strength) * 1.8 +
          stat(params.characterStats, agility) * 0.9 +
          stat(params.characterStats, intuition) * 0.6 +
          params.characterLevel * 4 -
          params.enemy.armor * 0.35;
      allyHitCount += 1;
      const luckySurge = critical ? 1.65 + stat(params.characterStats, luck) / 100 : 1;
      const ramp = 1 + allyHitCount * 0.08 + stat(params.characterStats, luck) / 280;
      const damage = Math.max(lastAllyDamage, Math.max(1, Math.floor(baseDamage * ramp * luckySurge)));
      lastAllyDamage = damage;
      enemyHealth = Math.max(0, enemyHealth - damage);
      turns.push({
        turn,
        actor: isPetTurn ? 'pet' as const : 'character' as const,
        target: 'enemy' as const,
        damage,
        critical,
        targetHealth: enemyHealth,
      });
      allyTurn = !isPetTurn && params.pet && petHealth > 0 ? 'pet' : 'character';
      nextSide = 'enemy';
      continue;
    }

    const target = params.pet && allyTurn === 'character' && petHealth > 0 ? 'pet' as const : 'character' as const;
    const enemyCrit = (stat(params.enemy.stats, luck) + turn * 5) % 13 === 0;
    const dodgeReduction =
      target === 'character' && stat(params.characterStats, agility) > stat(params.enemy.stats, intuition)
        ? stat(params.characterStats, agility) / 6
        : 0;
    const armorReduction = target === 'character' ? (params.characterArmor ?? 0) * 0.32 : 0;
    enemyHitCount += 1;
    const enemyBaseDamage =
      stat(params.enemy.stats, strength) * 1.5 +
      stat(params.enemy.stats, intuition) * 0.7 +
      params.enemy.level * 3 -
      dodgeReduction -
      armorReduction;
    const enemyLuckySurge = enemyCrit ? 1.65 + stat(params.enemy.stats, luck) / 100 : 1;
    const enemyRamp = 1 + enemyHitCount * 0.08 + stat(params.enemy.stats, luck) / 280;
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

  return {
    winner: won ? 'character' : 'enemy',
    turns,
    reward: won ? params.reward : ZERO_REWARD,
    ...(params.pet?.id ? { petId: params.pet.id } : {}),
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
