import type { GameIntent } from '../../game/types.js';
import { UiIcon } from './ui.js';

const META_ACTIONS = [
  {
    id: 'leaderboard',
    label: '\u0420\u0435\u0439\u0442\u0438\u043d\u0433',
    icon: 'trophy' as const,
    action: { type: 'openWindow', windowId: 'leaderboard' } as const,
  },
  {
    id: 'journal',
    label: '\u0416\u0443\u0440\u043d\u0430\u043b',
    icon: 'journal' as const,
    action: { type: 'openWindow', windowId: 'journal' } as const,
  },
  {
    id: 'gifts',
    label: '\u041f\u043e\u0434\u0430\u0440\u043a\u0438',
    icon: 'gift' as const,
    action: { type: 'openWindow', windowId: 'settings' } as const,
  },
  {
    id: 'settings',
    label: '\u041d\u0430\u0441\u0442\u0440\u043e\u0439\u043a\u0438',
    icon: 'settings' as const,
    action: { type: 'openWindow', windowId: 'settings' } as const,
  },
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
