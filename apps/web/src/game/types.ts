import type { EquipmentSlot, StatKey } from '@lov2/shared';

export type StageMode = 'world' | 'worldWindow' | 'sheet' | 'travel' | 'combat';

export type WorldLocation = 'courtyard' | 'harbor';

export type WorldWindowId =
  | 'none'
  | 'tavern'
  | 'store'
  | 'payments'
  | 'forge'
  | 'leaderboard'
  | 'tower'
  | 'boatman'
  | 'fountain'
  | 'exerciseDetail'
  | 'arenaPreview'
  | 'journal'
  | 'settings';

export type InfoWindowId = 'none' | 'heroInfo' | 'enemyInfo' | 'itemInfo' | 'petInfo';

export type SheetTab = 'inventory' | 'character' | 'achievements' | 'pets' | 'profile' | 'appearance';

export type MetaTab = 'news' | 'faq' | 'fanclub' | 'help';

export type RouteState = 'locked' | 'available' | 'traveling' | 'ready';

export type GameFlowStep =
  | 'idle'
  | 'taskAvailable'
  | 'taskAccepted'
  | 'traveling'
  | 'travelReady'
  | 'combatPending'
  | 'combatReplaying'
  | 'rewardReady';

export interface ExerciseDefinition {
  id: string;
  titleRu: string;
  subtitleRu: string;
  descriptionRu: string;
  locationHintRu: string;
  recommendedLevelRu: string;
  tone: 'gold' | 'mint' | 'ember';
}

export type GameIntent =
  | { type: 'openLocation'; location: WorldLocation }
  | { type: 'openWindow'; windowId: Exclude<WorldWindowId, 'none'> }
  | { type: 'closeWindow' }
  | { type: 'openSheet'; tab: SheetTab }
  | { type: 'closeSheet' }
  | { type: 'setSheetTab'; tab: SheetTab }
  | { type: 'openInfo'; windowId: Exclude<InfoWindowId, 'none'> }
  | { type: 'closeInfo' }
  | { type: 'selectTask'; questId: string }
  | { type: 'selectExercise'; exerciseId: string }
  | { type: 'selectArenaEnemy'; enemyId: string }
  | { type: 'acceptTask'; questId: string }
  | { type: 'startTravel'; questId: string; locationId: string }
  | { type: 'claimTravel'; travelId: string; rush?: boolean }
  | { type: 'startArena'; enemyId: string }
  | { type: 'resolveCombat'; combatId: string }
  | { type: 'togglePetAssist' }
  | { type: 'showReward' }
  | { type: 'closeReward' }
  | { type: 'openItemInfo'; inventoryStackId: string; slot?: EquipmentSlot }
  | { type: 'openPetInfo' }
  | { type: 'equipItem'; inventoryStackId: string }
  | { type: 'unequipItem'; inventoryStackId: string }
  | { type: 'purchaseItem'; itemId: string }
  | { type: 'selectForgeItem'; inventoryStackId: string | null }
  | { type: 'upgradeItem'; inventoryStackId: string }
  | { type: 'allocateStat'; stat: StatKey }
  | { type: 'refillEnergy'; mode: 'cup' | 'bundle' };
