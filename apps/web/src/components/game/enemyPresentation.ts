import type { EnemyDefinition } from '@lov2/shared';
import {
  STAT_AGILITY,
  STAT_INTUITION,
  STAT_LUCK,
  STAT_STRENGTH,
} from './GamePanels.data.js';
import { hasAsset } from './assets.js';

const ENEMY_ASSETS: Record<string, string> = {
  'mist-bandit': 'enemy-mist-bandit',
  'harbor-wraith': 'enemy-harbor-wraith',
  'baron-of-ashes': 'enemy-ash-baron',
};

const ENEMY_AVATAR_ASSETS: Partial<Record<string, string>> = {};

const ENEMY_DISPLAY_NAMES: Record<string, string> = {
  'mist-bandit': 'Роман',
  'harbor-wraith': 'Алексей',
  'baron-of-ashes': 'Женя',
};

const FALLBACK_ENEMY_ASSET_ID = 'enemy-ash-baron';

export function enemyDisplayName(enemy: EnemyDefinition) {
  return ENEMY_DISPLAY_NAMES[enemy.id] ?? enemy.nameRu;
}

export function enemyAssetId(enemy: EnemyDefinition) {
  const assetId = enemy.assetId ?? ENEMY_ASSETS[enemy.id] ?? FALLBACK_ENEMY_ASSET_ID;
  return hasAsset(assetId) ? assetId : FALLBACK_ENEMY_ASSET_ID;
}

export function enemyAvatarAssetId(enemy: EnemyDefinition) {
  const assetId = enemy.avatarAssetId ?? ENEMY_AVATAR_ASSETS[enemy.id] ?? null;
  return assetId && hasAsset(assetId) ? assetId : null;
}

export function enemyStatRows(enemy: EnemyDefinition) {
  return [
    { id: 'health', label: 'Здоровье', shortLabel: 'HP', value: enemy.health },
    { id: 'armor', label: 'Броня', shortLabel: 'Броня', value: enemy.armor },
    { id: 'strength', label: 'Сила', shortLabel: 'ATK', value: enemy.stats[STAT_STRENGTH] },
    { id: 'agility', label: 'Ловкость', shortLabel: 'DEX', value: enemy.stats[STAT_AGILITY] },
    { id: 'intuition', label: 'Интуиция', shortLabel: 'INT', value: enemy.stats[STAT_INTUITION] },
    { id: 'luck', label: 'Удача', shortLabel: 'LCK', value: enemy.stats[STAT_LUCK] },
  ];
}
