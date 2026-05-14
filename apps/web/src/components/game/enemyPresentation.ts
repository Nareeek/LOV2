import type { EnemyDefinition } from '@lov2/shared';
import {
  STAT_AGILITY,
  STAT_INTUITION,
  STAT_LUCK,
  STAT_STRENGTH,
} from './GamePanels.data.js';
import { assetPath, hasAsset } from './assets.js';

const ENEMY_IMAGE_ASSETS: Record<string, string> = {
  'mist-bandit': 'enemy-mist-bandit',
  'tavern-candle-imp': 'enemy-travel-bone-shaman',
  'harbor-wraith': 'enemy-travel-fog-harbor-wraith',
  'reef-stoneback': 'enemy-travel-corrupted-guardian',
  'baron-of-ashes': 'enemy-ash-baron',
  'arena-iron-vanguard': 'enemy-arena-male-nocturne-swordsman-01',
  'arena-moon-duelist': 'enemy-arena-female-veiled-swordsman-01',
  'arena-rune-seer': 'enemy-arena-male-oracle-mystic-01',
};

const ENEMY_AVATAR_ASSETS: Partial<Record<string, string>> = {};

const ENEMY_DISPLAY_NAMES: Record<string, string> = {
  'mist-bandit': 'Роман',
  'harbor-wraith': 'Алексей',
  'baron-of-ashes': 'Женя',
};

const FALLBACK_ENEMY_ASSETS = {
  travel: 'enemy-travel-fog-harbor-wraith',
  arena: 'enemy-arena-male-nocturne-swordsman-01',
} as const;

export function enemyDisplayName(enemy: EnemyDefinition) {
  return ENEMY_DISPLAY_NAMES[enemy.id] ?? enemy.nameRu;
}

export function enemyImageAssetId(enemy: EnemyDefinition) {
  const fallbackAssetId = FALLBACK_ENEMY_ASSETS[enemy.encounterKind];
  const candidates = [
    ENEMY_IMAGE_ASSETS[enemy.id],
    enemy.assetId,
    fallbackAssetId,
  ];
  return candidates.find((assetId) => assetId && hasAsset(assetId)) ?? fallbackAssetId;
}

export function enemyImagePath(enemy: EnemyDefinition) {
  return assetPath(enemyImageAssetId(enemy));
}

export function enemyAvatarImagePath(enemy: EnemyDefinition) {
  const assetId = enemy.avatarAssetId ?? ENEMY_AVATAR_ASSETS[enemy.id] ?? null;
  return assetPath(assetId && hasAsset(assetId) ? assetId : enemyImageAssetId(enemy));
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
