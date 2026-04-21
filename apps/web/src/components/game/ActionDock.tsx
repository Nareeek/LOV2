import type { SceneId } from '@lov2/shared';
import type { GameFlowStep, GameIntent } from '../../game/types.js';

type DockEntry = {
  id: string;
  label: string;
  symbol: string;
  sceneId?: SceneId;
  overlay?: 'store';
  badge?: string;
};

export function ActionDock({
  activeScene,
  flowStep,
  hasPendingCombat,
  hasReadyTravel,
  onIntent,
}: {
  activeScene: SceneId;
  flowStep: GameFlowStep;
  hasPendingCombat: boolean;
  hasReadyTravel: boolean;
  onIntent: (intent: GameIntent) => void;
}) {
  const entries: DockEntry[] = [
    { id: 'tavern', label: 'Таверна', symbol: 'T', sceneId: 'tavern', ...(flowStep === 'taskAvailable' ? { badge: '!' } : {}) },
    { id: 'map', label: 'Путь', symbol: 'M', sceneId: 'map', ...(hasReadyTravel ? { badge: '!' } : {}) },
    { id: 'combat', label: 'Арена', symbol: 'X', sceneId: 'combat', ...(hasPendingCombat ? { badge: '!' } : {}) },
    { id: 'store', label: 'Лавка', symbol: '+', overlay: 'store' },
  ];

  return (
    <aside className="stage-right-rail" data-testid="right-action-dock">
      <nav className="world-rail" data-testid="icon-dock" aria-label="Быстрые разделы мира">
        {entries.map((entry) => (
          <button
            key={entry.id}
            data-testid={`action-${entry.id}`}
            className={`world-rail-button ${entry.sceneId && activeScene === entry.sceneId ? 'active' : ''}`}
            aria-label={entry.label}
            onClick={() =>
              entry.sceneId
                ? onIntent({ type: 'openScene', sceneId: entry.sceneId })
                : onIntent({ type: 'openOverlay', overlay: 'store' })
            }
          >
            <span className="dock-symbol" aria-hidden="true">
              {entry.symbol}
            </span>
            <small>{entry.label}</small>
            {entry.badge && <strong>{entry.badge}</strong>}
          </button>
        ))}
      </nav>
    </aside>
  );
}
