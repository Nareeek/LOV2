import type { GameIntent } from '../../game/types.js';
import { UiIcon } from './ui.js';

const META_ACTIONS = [
  { id: 'leaderboard', label: 'Рейтинг', icon: 'trophy' as const, action: { type: 'openSheet', tab: 'achievements' } as const },
  { id: 'journal', label: 'Журнал', icon: 'journal' as const, action: { type: 'openWindow', windowId: 'journal' } as const },
  { id: 'gifts', label: 'Подарки', icon: 'gift' as const, action: { type: 'openWindow', windowId: 'settings' } as const },
  { id: 'settings', label: 'Настройки', icon: 'settings' as const, action: { type: 'openWindow', windowId: 'settings' } as const },
] as const;

export function ActionDock({
  onIntent,
}: {
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <aside className="shell-reset-meta-rail" data-testid="right-action-dock">
      {META_ACTIONS.map((entry) => (
        <button
          key={entry.id}
          type="button"
          className="shell-reset-meta-orb"
          data-testid={`action-${entry.id}`}
          aria-label={entry.label}
          title={entry.label}
          onClick={() => onIntent(entry.action)}
        >
          <UiIcon name={entry.icon} />
        </button>
      ))}
    </aside>
  );
}
