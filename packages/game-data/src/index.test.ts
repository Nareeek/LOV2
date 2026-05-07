import { describe, expect, it } from 'vitest';
import { gameData, gameAssetIds, sceneDefinitions, validateGameData } from './index.js';
import type { PetCombatStats } from '@lov2/shared';

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

describe('game data', () => {
  it('is internally valid', () => {
    expect(() => validateGameData()).not.toThrow();
  });

  it('contains the vertical slice boss', () => {
    expect(gameData.enemies.some((enemy) => enemy.boss)).toBe(true);
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
    const pet = gameData.items.find((item) => item.id === 'ember-whelp');

    expect(pet?.petCombatStats).toEqual({ level: 12, health: 1800 });
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

  it('assigns positive energy costs to all starter quests', () => {
    expect(gameData.quests.every((quest) => quest.energyCost > 0)).toBe(true);
  });
});
