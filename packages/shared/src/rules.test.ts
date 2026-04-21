import { describe, expect, it } from 'vitest';
import {
  DEFAULT_MAX_ENERGY,
  experienceForLevel,
  hasEnoughEnergy,
  levelFromExperience,
  maxHealthForStats,
  refillEnergy,
  resolveCombat,
  spendEnergy,
} from './rules.js';
import type { EnemyDefinition } from './types.js';

describe('game rules', () => {
  it('uses monotonic experience levels', () => {
    expect(experienceForLevel(2)).toBeGreaterThan(experienceForLevel(1));
    expect(levelFromExperience(experienceForLevel(5))).toBe(5);
  });

  it('derives health from stats and level', () => {
    expect(
      maxHealthForStats({ сила: 12, ловкость: 10, интуиция: 10, удача: 8 }, 3),
    ).toBeGreaterThan(100);
  });

  it('validates and refills energy', () => {
    expect(hasEnoughEnergy(5, 3)).toBe(true);
    expect(hasEnoughEnergy(1, 3)).toBe(false);
    expect(spendEnergy(6, 2)).toBe(4);
    expect(refillEnergy(2, DEFAULT_MAX_ENERGY)).toBe(DEFAULT_MAX_ENERGY);
  });

  it('resolves combat server-side from intent and game data', () => {
    const enemy: EnemyDefinition = {
      id: 'mist-bandit',
      nameRu: 'Туманный налетчик',
      level: 1,
      health: 50,
      boss: false,
      stats: { сила: 5, ловкость: 4, интуиция: 3, удача: 2 },
      reward: { experience: 25, gold: 10, gems: 0, itemIds: [] },
    };

    const combat = resolveCombat({
      characterLevel: 2,
      characterHealth: 140,
      characterStats: { сила: 14, ловкость: 12, интуиция: 11, удача: 9 },
      enemy,
      reward: enemy.reward,
    });

    expect(combat.winner).toBe('character');
    expect(combat.reward.experience).toBe(25);
    expect(combat.turns.length).toBeGreaterThan(0);
  });
});
