import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_ENERGY,
  ENERGY_REFILL_LARGE,
  ENERGY_REFILL_SMALL,
  experienceForLevel,
  getDailyEnergyResetBoundary,
  hasEnoughEnergy,
  levelFromExperience,
  maxHealthForStats,
  damageRangeForClass,
  primaryDamageStatForClass,
  refillEnergy,
  resolveCombat,
  shouldResetDailyEnergy,
  spendEnergy,
  statAllocationGoldCost,
} from './rules.js';
import type { EnemyDefinition } from './types.js';

describe('game rules', () => {
  it('uses monotonic experience levels', () => {
    expect(experienceForLevel(2)).toBeGreaterThan(experienceForLevel(1));
    expect(levelFromExperience(experienceForLevel(5))).toBe(5);
  });

  it('derives health from stats and level', () => {
    expect(maxHealthForStats({ сила: 12, ловкость: 10, интуиция: 10, удача: 8 }, 3)).toBeGreaterThan(100);
  });

  it('uses each class primary stat for damage ranges', () => {
    const stats = {
      ['\u0441\u0438\u043b\u0430']: 12,
      ['\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c']: 24,
      ['\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f']: 18,
      ['\u0443\u0434\u0430\u0447\u0430']: 10,
    } as EnemyDefinition['stats'];

    expect(primaryDamageStatForClass('swordsman')).toBe('\u0441\u0438\u043b\u0430');
    expect(primaryDamageStatForClass('ranger')).toBe('\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c');
    expect(primaryDamageStatForClass('mage')).toBe('\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f');
    expect(damageRangeForClass(stats, 'ranger', 1).min).toBeGreaterThan(
      damageRangeForClass(stats, 'swordsman', 1).min,
    );
  });

  it('prices manual stat allocation from the current stat value', () => {
    expect(statAllocationGoldCost(10)).toBe(75);
    expect(statAllocationGoldCost(10, 2)).toBe(155);
  });

  it('validates and refills energy', () => {
    expect(hasEnoughEnergy(5, 3)).toBe(true);
    expect(hasEnoughEnergy(1, 3)).toBe(false);
    expect(spendEnergy(6, 2)).toBe(4);
    expect(refillEnergy(2, DEFAULT_MAX_ENERGY)).toBe(DEFAULT_MAX_ENERGY);
    expect(refillEnergy(20, DEFAULT_MAX_ENERGY, ENERGY_REFILL_SMALL)).toBe(25);
    expect(refillEnergy(12, DEFAULT_MAX_ENERGY, ENERGY_REFILL_LARGE)).toBe(DEFAULT_MAX_ENERGY);
  });

  it('tracks the daily 04:00 energy reset boundary', () => {
    const beforeReset = new Date(2026, 3, 22, 3, 40, 0);
    const afterReset = new Date(2026, 3, 22, 5, 10, 0);

    expect(getDailyEnergyResetBoundary(beforeReset).getHours()).toBe(4);
    expect(getDailyEnergyResetBoundary(beforeReset).getDate()).toBe(21);
    expect(getDailyEnergyResetBoundary(afterReset).getDate()).toBe(22);
    expect(shouldResetDailyEnergy(new Date(2026, 3, 21, 5, 0, 0), afterReset)).toBe(true);
    expect(shouldResetDailyEnergy(new Date(2026, 3, 22, 4, 30, 0), afterReset)).toBe(false);
  });

  it('resolves combat server-side from intent and game data', () => {
    const enemy: EnemyDefinition = {
      id: 'mist-bandit',
      nameRu: 'Туманный налетчик',
      level: 1,
      health: 50,
      armor: 0,
      boss: false,
      stats: { сила: 5, ловкость: 4, интуиция: 3, удача: 2 },
      reward: { experience: 25, gold: 10, gems: 0, itemIds: [] },
    };

    const combat = resolveCombat({
      characterLevel: 2,
      characterHealth: 140,
      characterStats: { сила: 18, ловкость: 15, интуиция: 12, удача: 9 },
      enemy,
      reward: enemy.reward,
      characterArmor: 3,
    });

    expect(combat.winner).toBe('character');
    expect(combat.reward.experience).toBe(25);
    expect(combat.turns.length).toBeGreaterThan(0);
  });

  it('keeps combat hit values deterministic and rising for the replay', () => {
    const enemy: EnemyDefinition = {
      id: 'training-knight',
      nameRu: 'Тренировочный рыцарь',
      level: 8,
      health: 1800,
      armor: 6,
      boss: false,
      stats: { сила: 14, ловкость: 8, интуиция: 10, удача: 6 },
      reward: { experience: 45, gold: 20, gems: 0, itemIds: [] },
    };

    const combat = resolveCombat({
      characterLevel: 9,
      characterHealth: 2600,
      characterStats: { сила: 28, ловкость: 19, интуиция: 16, удача: 14 },
      enemy,
      reward: enemy.reward,
      characterArmor: 18,
      pet: { id: 'kitten', level: 17, health: 2100 },
    });

    const allyHits = combat.turns.filter((turn) => turn.target === 'enemy').map((turn) => turn.damage);
    const enemyHits = combat.turns.filter((turn) => turn.actor === 'enemy').map((turn) => turn.damage);

    expect(combat.petId).toBe('kitten');
    expect(combat.petFoodSpent).toBe(1);
    expect(combat.petExperienceGained).toBe(1);
    expect(combat.turns.some((turn) => turn.actor === 'pet')).toBe(true);
    expect(allyHits.length).toBeGreaterThan(1);
    for (let index = 1; index < allyHits.length; index += 1) {
      expect(allyHits[index]).toBeGreaterThanOrEqual(allyHits[index - 1]!);
    }
    for (let index = 1; index < enemyHits.length; index += 1) {
      expect(enemyHits[index]).toBeGreaterThanOrEqual(enemyHits[index - 1]!);
    }
  });

  it('lets a called pet take the first allied action', () => {
    const stats = {
      ['\u0441\u0438\u043b\u0430']: 5,
      ['\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c']: 4,
      ['\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f']: 3,
      ['\u0443\u0434\u0430\u0447\u0430']: 2,
    } as EnemyDefinition['stats'];
    const enemy: EnemyDefinition = {
      id: 'quick-pet-target',
      nameRu: 'Pet target',
      level: 1,
      health: 20,
      armor: 0,
      boss: false,
      stats,
      reward: { experience: 5, gold: 1, gems: 0, itemIds: [] },
    };

    const combat = resolveCombat({
      characterLevel: 3,
      characterHealth: 160,
      characterStats: {
        ['\u0441\u0438\u043b\u0430']: 30,
        ['\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c']: 20,
        ['\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f']: 15,
        ['\u0443\u0434\u0430\u0447\u0430']: 10,
      },
      enemy,
      reward: enemy.reward,
      characterArmor: 0,
      pet: { id: 'wyrmlet', level: 14, health: 1950 },
    });

    expect(combat.petId).toBe('wyrmlet');
    expect(combat.turns[0]?.actor).toBe('pet');
  });

  it('spends one pet food and grants no pet XP when a called pet participates in a loss', () => {
    const stats = {
      ['\u0441\u0438\u043b\u0430']: 80,
      ['\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c']: 1,
      ['\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f']: 80,
      ['\u0443\u0434\u0430\u0447\u0430']: 1,
    } as EnemyDefinition['stats'];
    const enemy: EnemyDefinition = {
      id: 'pet-loss-target',
      nameRu: 'Pet loss target',
      level: 1,
      health: 5000,
      armor: 0,
      boss: false,
      stats,
      reward: { experience: 5, gold: 1, gems: 0, itemIds: [] },
    };

    const combat = resolveCombat({
      characterLevel: 3,
      characterHealth: 20,
      characterStats: {
        ['\u0441\u0438\u043b\u0430']: 30,
        ['\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c']: 20,
        ['\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f']: 15,
        ['\u0443\u0434\u0430\u0447\u0430']: 10,
      },
      enemy,
      reward: enemy.reward,
      characterArmor: 0,
      pet: { id: 'wyrmlet', level: 14, health: 10, food: 8 },
    });

    expect(combat.winner).toBe('enemy');
    expect(combat.turns.some((turn) => turn.actor === 'pet')).toBe(true);
    expect(combat.petFoodSpent).toBe(1);
    expect(combat.petExperienceGained).toBeUndefined();
  });
});
