import type { BootstrapState } from '@lov2/shared';
import { deriveRouteState, getQuestProgress } from '../../game/flow.js';
import type { GameIntent } from '../../game/types.js';

export function TaskRail({
  state,
  now,
  onIntent,
}: {
  state: BootstrapState;
  now: number;
  onIntent: (intent: GameIntent) => void;
}) {
  const quests = [...state.quests].sort((left, right) => {
    const leftActive = getQuestProgress(state, left.id)?.status === 'active' ? 1 : 0;
    const rightActive = getQuestProgress(state, right.id)?.status === 'active' ? 1 : 0;
    return rightActive - leftActive;
  });

  return (
    <section className="task-rail" data-testid="quest-ribbons">
      {quests.slice(0, 3).map((quest) => {
        const progress = getQuestProgress(state, quest.id);
        const routeState = deriveRouteState(state, quest.id, now);
        return (
          <button
            key={quest.id}
            className={`quest-ribbon ${routeState}`}
            data-testid={`task-ribbon-${quest.id}`}
            onClick={() => onIntent({ type: 'selectTask', questId: quest.id })}
          >
            <small>
              {labelQuestStatus(progress?.status) ?? 'новое'} | энергия {quest.energyCost}
            </small>
            <span>{quest.titleRu}</span>
            <strong>{labelRouteState(routeState)}</strong>
          </button>
        );
      })}
    </section>
  );
}

function labelRouteState(routeState: ReturnType<typeof deriveRouteState>) {
  switch (routeState) {
    case 'ready':
      return 'готово';
    case 'traveling':
      return 'в пути';
    case 'available':
      return 'доступно';
    default:
      return 'закрыто';
  }
}

function labelQuestStatus(status: NonNullable<ReturnType<typeof getQuestProgress>>['status'] | undefined) {
  switch (status) {
    case 'active':
      return 'активно';
    case 'completed':
      return 'завершено';
    case 'claimed':
      return 'получено';
    case 'available':
      return 'доступно';
    default:
      return null;
  }
}
