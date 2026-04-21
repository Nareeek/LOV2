import { describe, expect, it } from 'vitest';
import { gameData, gameAssetIds, sceneDefinitions, validateGameData } from './index.js';

describe('game data', () => {
  it('is internally valid', () => {
    expect(() => validateGameData()).not.toThrow();
  });

  it('contains the vertical slice boss', () => {
    expect(gameData.enemies.some((enemy) => enemy.boss)).toBe(true);
  });

  it('defines normalized clickable scenes', () => {
    for (const scene of sceneDefinitions) {
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

  it('assigns positive energy costs to all starter quests', () => {
    expect(gameData.quests.every((quest) => quest.energyCost > 0)).toBe(true);
  });
});
