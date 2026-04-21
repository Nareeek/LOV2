import type { BootstrapState, CombatEncounter, CombatLog, QuestDefinition, SceneId, TravelTask } from '@lov2/shared';
import type { GameFlowStep, GameOverlayId, RouteState } from './types.js';

export function getActiveTravel(state: BootstrapState): TravelTask | undefined {
  return state.travels.find((travel) => travel.status !== 'claimed');
}

export function getPendingCombat(state: BootstrapState): CombatEncounter | undefined {
  return state.combats.find((combat) => combat.status === 'pending');
}

export function getLatestResolvedCombat(state: BootstrapState): CombatEncounter | undefined {
  return state.combats.find((combat) => combat.status !== 'pending');
}

export function isTravelReady(travel: TravelTask, now: number): boolean {
  return new Date(travel.completesAt).getTime() <= now;
}

export function getQuestDefinition(state: BootstrapState, questId: string): QuestDefinition | undefined {
  return state.quests.find((quest) => quest.id === questId);
}

export function getQuestProgress(state: BootstrapState, questId: string) {
  return state.questProgress.find((quest) => quest.questId === questId);
}

export function deriveFlowStep(
  state: BootstrapState,
  overlay: GameOverlayId,
  now: number,
): GameFlowStep {
  if (overlay === 'combatReplay') {
    return 'combatReplaying';
  }
  if (overlay === 'reward') {
    return 'rewardReady';
  }

  const pendingCombat = getPendingCombat(state);
  if (pendingCombat) {
    return 'combatPending';
  }

  const activeTravel = getActiveTravel(state);
  if (activeTravel) {
    return isTravelReady(activeTravel, now) ? 'travelReady' : 'traveling';
  }

  if (state.questProgress.some((quest) => quest.status === 'active')) {
    return 'taskAccepted';
  }
  if (state.quests.length > 0) {
    return 'taskAvailable';
  }

  return 'idle';
}

export function deriveRouteState(
  state: BootstrapState,
  questId: string,
  now: number,
): RouteState {
  const activeTravel = getActiveTravel(state);
  if (activeTravel?.questId === questId) {
    return isTravelReady(activeTravel, now) ? 'ready' : 'traveling';
  }

  const progress = getQuestProgress(state, questId);
  return progress?.status === 'active' ? 'available' : 'locked';
}

export function defaultOverlayForScene(sceneId: SceneId): GameOverlayId {
  if (sceneId === 'tavern') return 'taskList';
  if (sceneId === 'combat') return 'combatReady';
  return 'none';
}

export function getCombatReplayFrame(
  combatLog: CombatLog | undefined,
  enemyHealth: number,
  fallbackCharacterHealth: number,
  visibleTurns: number,
) {
  if (!combatLog) {
    return {
      characterCurrent: fallbackCharacterHealth,
      characterStart: fallbackCharacterHealth,
      enemyCurrent: enemyHealth,
      enemyStart: enemyHealth,
      lastActor: null as 'character' | 'enemy' | null,
    };
  }

  const visible = combatLog.turns.slice(0, Math.max(0, visibleTurns));
  const characterTurns = combatLog.turns.filter((turn) => turn.actor === 'enemy');
  const enemyTurns = combatLog.turns.filter((turn) => turn.actor === 'character');
  const characterStart = Math.max(
    fallbackCharacterHealth,
    ...characterTurns.map((turn) => turn.targetHealth + turn.damage),
  );
  const enemyStart = Math.max(enemyHealth, ...enemyTurns.map((turn) => turn.targetHealth + turn.damage));

  let characterCurrent = characterStart;
  let enemyCurrent = enemyStart;
  let lastActor: 'character' | 'enemy' | null = null;
  for (const turn of visible) {
    if (turn.actor === 'character') {
      enemyCurrent = turn.targetHealth;
    } else {
      characterCurrent = turn.targetHealth;
    }
    lastActor = turn.actor;
  }

  return {
    characterCurrent,
    characterStart,
    enemyCurrent,
    enemyStart,
    lastActor,
  };
}
