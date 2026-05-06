import type { EnemyDefinition } from '@lov2/shared';
import {
  STAT_AGILITY,
  STAT_INTUITION,
  STAT_LUCK,
  STAT_STRENGTH,
} from './GamePanels.data.js';

const ENEMY_ASSETS: Record<string, string> = {
  'mist-bandit': 'enemy-mist-bandit',
  'harbor-wraith': 'enemy-harbor-wraith',
  'baron-of-ashes': 'enemy-ash-baron',
};

export function enemyDisplayName(enemy: EnemyDefinition) {
  return enemy.nameRu;
}

export function enemyAssetId(enemy: EnemyDefinition) {
  return ENEMY_ASSETS[enemy.id] ?? 'enemy-ash-baron';
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