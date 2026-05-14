import { describe, expect, it } from 'vitest';
import type { EnemyDefinition } from '@lov2/shared';
import { enemyAvatarImagePath, enemyImagePath } from './enemyPresentation.js';

describe('enemy presentation images', () => {
  it('maps a known travel enemy to its generated PNG', () => {
    expect(enemyImagePath(enemy({ id: 'harbor-wraith', assetId: 'enemy-harbor-wraith' }))).toBe(
      '/assets/generated/enemies/travel/enemy_travel_fog_harbor_wraith.png',
    );
  });

  it('maps a known arena opponent to its generated PNG', () => {
    expect(enemyImagePath(enemy({ id: 'arena-iron-vanguard', assetId: 'enemy-arena-male-nocturne-swordsman-01' }))).toBe(
      '/assets/generated/enemies/arena/enemy_arena_male_nocturne_swordsman_01 (1).png',
    );
  });

  it('falls back to a generated PNG for unknown or missing assets', () => {
    const unknown = enemy({ id: 'unknown-enemy', assetId: 'missing-enemy-asset' });
    const unknownArena = enemy({
      id: 'unknown-arena-opponent',
      assetId: 'missing-arena-asset',
      encounterKind: 'arena',
    });

    expect(enemyImagePath(unknown)).toBe('/assets/generated/enemies/travel/enemy_travel_fog_harbor_wraith.png');
    expect(enemyAvatarImagePath(unknown)).toBe('/assets/generated/enemies/travel/enemy_travel_fog_harbor_wraith.png');
    expect(enemyImagePath(unknownArena)).toBe(
      '/assets/generated/enemies/arena/enemy_arena_male_nocturne_swordsman_01 (1).png',
    );
  });
});

function enemy(
  overrides: Pick<EnemyDefinition, 'id' | 'assetId'> & Partial<Pick<EnemyDefinition, 'encounterKind'>>,
): EnemyDefinition {
  return {
    id: overrides.id,
    assetId: overrides.assetId,
    encounterKind: overrides.encounterKind ?? 'travel',
    difficultyTier: 'standard',
    locationIds: ['test-location'],
    scaling: {
      levelOffset: 0,
      healthMultiplier: 1,
      statMultiplier: 1,
      armorMultiplier: 1,
      rewardMultiplier: 1,
    },
    nameRu: 'Test enemy',
    level: 1,
    health: 10,
    armor: 1,
    boss: false,
    stats: { '\u0441\u0438\u043b\u0430': 1, '\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c': 1, '\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f': 1, '\u0443\u0434\u0430\u0447\u0430': 1 },
    reward: { experience: 1, gold: 1, gems: 0, itemIds: [] },
  };
}
