import { describe, expect, it } from 'vitest';
import { gameData, gameAssetIds, sceneDefinitions, validateGameData } from './index.js';
import type { PetCombatStats } from '@lov2/shared';

type RewardOwner = (typeof gameData.quests | typeof gameData.enemies)[number];

function withPetCombatStats<T>(itemId: string, stats: PetCombatStats | undefined, callback: () => T): T {
  const item = gameData.items.find((entry) => entry.id === itemId);
  if (!item) {
    throw new Error(`missing test item ${itemId}`);
  }

  const mutableItem = item as typeof item & { petCombatStats?: PetCombatStats };
  const hadStats = Object.hasOwn(mutableItem, 'petCombatStats');
  const originalStats = mutableItem.petCombatStats;

  try {
    if (stats) {
      mutableItem.petCombatStats = stats;
    } else {
      delete mutableItem.petCombatStats;
    }

    return callback();
  } finally {
    if (hadStats && originalStats) {
      mutableItem.petCombatStats = originalStats;
    } else {
      delete mutableItem.petCombatStats;
    }
  }
}

function withRewardItemIds<T>(owner: RewardOwner, itemIds: string[], callback: () => T): T {
  const originalItemIds = owner.reward.itemIds;

  try {
    owner.reward.itemIds = itemIds;
    return callback();
  } finally {
    owner.reward.itemIds = originalItemIds;
  }
}

describe('game data', () => {
  it('is internally valid', () => {
    expect(() => validateGameData()).not.toThrow();
  });

  it('contains the vertical slice boss', () => {
    expect(gameData.enemies.some((enemy) => enemy.boss)).toBe(true);
  });

  it('defines the PR16 follow-up quest with valid reward content', () => {
    const quest = gameData.quests.find((entry) => entry.id === 'ember-whelp-first-flight');

    expect(quest).toMatchObject({
      locationId: 'fog-harbor',
      enemyId: 'harbor-wraith',
      energyCost: 3,
      reward: { experience: 180, gold: 95, gems: 0, itemIds: ['moon-vest'] },
    });
    expect(gameData.locations.some((location) => location.id === quest?.locationId)).toBe(true);
    expect(gameData.enemies.some((enemy) => enemy.id === quest?.enemyId)).toBe(true);
    expect(quest?.reward.itemIds.every((itemId) => gameData.items.some((item) => item.id === itemId))).toBe(true);
  });

  it('defines normalized clickable scenes', () => {
    for (const scene of sceneDefinitions) {
      if (['combat', 'inventory', 'character', 'pets', 'journal'].includes(scene.id)) {
        expect(scene.hotspots.length).toBe(0);
        continue;
      }

      expect(scene.hotspots.length).toBeGreaterThan(0);
      const hotspotIds = new Set(scene.hotspots.map((hotspot) => hotspot.id));
      expect(hotspotIds.size).toBe(scene.hotspots.length);

      for (const hotspot of scene.hotspots) {
        expect(hotspot.rect.x).toBeGreaterThanOrEqual(0);
        expect(hotspot.rect.y).toBeGreaterThanOrEqual(0);
        expect(hotspot.rect.width).toBeGreaterThan(0);
        expect(hotspot.rect.height).toBeGreaterThan(0);
        expect(hotspot.rect.x + hotspot.rect.width).toBeLessThanOrEqual(1);
        expect(hotspot.rect.y + hotspot.rect.height).toBeLessThanOrEqual(1);
      }
    }
  });

  it('tracks scene and item assets by id', () => {
    const knownAssets = new Set<string>(gameAssetIds);
    expect(sceneDefinitions.every((scene) => knownAssets.has(scene.sceneAssetId))).toBe(true);
    expect(gameData.items.every((item) => knownAssets.has(item.iconAssetId))).toBe(true);
  });

  it('defines positive combat stats for pet items', () => {
    const pets = gameData.items.filter((item) => item.slot === 'pet');

    expect(pets.map((pet) => pet.id)).toEqual(['foxling', 'wyrmlet', 'kitten', 'ember-whelp']);
    expect(pets.every((pet) => pet.petCombatStats && pet.petCombatStats.level > 0 && pet.petCombatStats.health > 0)).toBe(true);
  });

  it('rejects pet items without positive integer combat stats', () => {
    withPetCombatStats('ember-whelp', { level: 12, health: 0 }, () => {
      expect(() => validateGameData()).toThrow(/positive integer combat stats/);
    });

    withPetCombatStats('ember-whelp', { level: 1.5, health: 1800 }, () => {
      expect(() => validateGameData()).toThrow(/positive integer combat stats/);
    });

    withPetCombatStats('ember-whelp', undefined, () => {
      expect(() => validateGameData()).toThrow(/positive integer combat stats/);
    });
  });

  it('rejects pet combat stats on non-pet items', () => {
    withPetCombatStats('duelist-rapier', { level: 1, health: 1 }, () => {
      expect(() => validateGameData()).toThrow(/non-pet item/);
    });
  });

  it('rejects missing item references in quest and enemy rewards', () => {
    const quest = gameData.quests.find((entry) => entry.id === 'ember-whelp-first-flight');
    const enemy = gameData.enemies.find((entry) => entry.id === 'harbor-wraith');

    expect(quest).toBeDefined();
    expect(enemy).toBeDefined();

    withRewardItemIds(quest!, ['missing-moon-vest'], () => {
      expect(() => validateGameData()).toThrow(/quest ember-whelp-first-flight reward references missing item/);
    });
    withRewardItemIds(enemy!, ['missing-wraith-drop'], () => {
      expect(() => validateGameData()).toThrow(/enemy harbor-wraith reward references missing item/);
    });
  });

  it('does not grant gems from quest or enemy combat rewards', () => {
    expect(gameData.quests.every((quest) => quest.reward.gems === 0)).toBe(true);
    expect(gameData.enemies.every((enemy) => enemy.reward.gems === 0)).toBe(true);
  });

  it('assigns positive energy costs to all starter quests', () => {
    expect(gameData.quests.every((quest) => quest.energyCost > 0)).toBe(true);
  });
});
