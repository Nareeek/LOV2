import { describe, expect, it } from 'vitest';
import { deriveFlowStep, deriveRouteState, getCombatReplayFrame } from './flow.js';
import type { BootstrapState } from '@lov2/shared';

describe('game flow helpers', () => {
  it('moves from task to travel to combat to reward', () => {
    const now = Date.now();
    const base = createState();
    expect(deriveFlowStep(base, { replayActive: false, rewardVisible: false }, now)).toBe('taskAvailable');

    const withQuest = {
      ...base,
      questProgress: [{ id: 'qp1', characterId: 'c1', questId: 'quest-1', status: 'active' as const, progress: 0, target: 1 }],
    } satisfies BootstrapState;
    expect(deriveFlowStep(withQuest, { replayActive: false, rewardVisible: false }, now)).toBe('taskAccepted');

    const withTravel = {
      ...withQuest,
      travels: [
        {
          id: 'travel-1',
          characterId: 'c1',
          locationId: 'loc-1',
          questId: 'quest-1',
          status: 'traveling' as const,
          startedAt: new Date(now - 5000).toISOString(),
          completesAt: new Date(now + 5000).toISOString(),
        },
      ],
    } satisfies BootstrapState;
    expect(deriveFlowStep(withTravel, { replayActive: false, rewardVisible: false }, now)).toBe('traveling');
    expect(deriveRouteState(withTravel, 'quest-1', now)).toBe('traveling');
    expect(deriveRouteState(withTravel, 'quest-1', now + 6000)).toBe('ready');

    const withCombat = {
      ...withQuest,
      combats: [{ id: 'combat-1', characterId: 'c1', enemyId: 'enemy-1', status: 'pending' as const, createdAt: new Date(now).toISOString() }],
    } satisfies BootstrapState;
    expect(deriveFlowStep(withCombat, { replayActive: false, rewardVisible: false }, now)).toBe('combatPending');

    const withResolvedCombat = {
      ...withQuest,
      combats: [
        {
          id: 'combat-1',
          characterId: 'c1',
          enemyId: 'enemy-1',
          status: 'won' as const,
          createdAt: new Date(now).toISOString(),
          log: {
            winner: 'character' as const,
            turns: [{ turn: 1, actor: 'character' as const, damage: 30, critical: false, targetHealth: 0 }],
            reward: { experience: 10, gold: 5, gems: 0, itemIds: [] },
          },
        },
      ],
    } satisfies BootstrapState;
    expect(deriveFlowStep(withResolvedCombat, { replayActive: true, rewardVisible: false }, now)).toBe('combatReplaying');
    expect(deriveFlowStep(withResolvedCombat, { replayActive: false, rewardVisible: true }, now)).toBe('rewardReady');
  });

  it('computes combat replay health snapshots from visible turns', () => {
    const frame = getCombatReplayFrame(
      {
        winner: 'character',
        turns: [
          { turn: 1, actor: 'character', damage: 30, critical: false, targetHealth: 50 },
          { turn: 1, actor: 'enemy', damage: 12, critical: false, targetHealth: 108 },
        ],
        reward: { experience: 1, gold: 1, gems: 0, itemIds: [] },
      },
      80,
      120,
      2,
    );

    expect(frame.enemyCurrent).toBe(50);
    expect(frame.characterCurrent).toBe(108);
    expect(frame.lastActor).toBe('enemy');
  });
});

function createState(): BootstrapState {
  return {
    user: null,
    character: null,
    races: [],
    items: [],
    quests: [
      {
        id: 'quest-1',
        titleRu: 'Задание',
        descriptionRu: 'Описание',
        locationId: 'loc-1',
        enemyId: 'enemy-1',
        energyCost: 2,
        reward: { experience: 10, gold: 5, gems: 0, itemIds: [] },
      },
    ],
    locations: [{ id: 'loc-1', nameRu: 'Локация', descriptionRu: 'Описание', travelSeconds: 5, sceneAssetId: 'scene-map' }],
    enemies: [
      {
        id: 'enemy-1',
        nameRu: 'Враг',
        level: 1,
        health: 80,
        armor: 2,
        boss: false,
        stats: { сила: 2, ловкость: 2, интуиция: 2, удача: 2 },
        reward: { experience: 10, gold: 5, gems: 0, itemIds: [] },
      },
    ],
    scenes: [],
    inventory: [],
    petRoster: [],
    questProgress: [],
    travels: [],
    combats: [],
  };
}
