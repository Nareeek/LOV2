import type { SceneId, StatKey } from '@lov2/shared';

export type ScreenMode =
  | 'hub'
  | 'npcDialog'
  | 'map'
  | 'combat'
  | 'characterSheet'
  | 'inventorySheet'
  | 'petSheet'
  | 'journalSheet'
  | 'storeSheet'
  | 'reward';

export type ChromePreset = 'world' | 'sheet' | 'combat' | 'reward';

export type GameOverlayId =
  | 'none'
  | 'characterInfo'
  | 'enemyInfo'
  | 'taskList'
  | 'taskDetail'
  | 'travel'
  | 'combatReady'
  | 'combatReplay'
  | 'reward'
  | 'itemInfo'
  | 'petInfo'
  | 'store';

export type GameFlowStep =
  | 'idle'
  | 'taskAvailable'
  | 'taskAccepted'
  | 'traveling'
  | 'travelReady'
  | 'combatPending'
  | 'combatReplaying'
  | 'rewardReady';

export type RouteState = 'locked' | 'available' | 'traveling' | 'ready';

export type GameIntent =
  | { type: 'openScene'; sceneId: SceneId }
  | { type: 'openOverlay'; overlay: Exclude<GameOverlayId, 'none'> }
  | { type: 'closeOverlay' }
  | { type: 'openTaskList' }
  | { type: 'selectTask'; questId: string }
  | { type: 'acceptTask'; questId: string }
  | { type: 'startTravel'; questId: string; locationId: string }
  | { type: 'claimTravel'; travelId: string }
  | { type: 'openCombat' }
  | { type: 'resolveCombat'; combatId: string }
  | { type: 'showReward' }
  | { type: 'togglePetAssist' }
  | { type: 'openItemInfo'; inventoryStackId: string }
  | { type: 'openPetInfo' }
  | { type: 'equipItem'; inventoryStackId: string }
  | { type: 'allocateStat'; stat: StatKey }
  | { type: 'refillEnergy' };
