import type { MetaTab } from '../../game/types.js';

const FRIENDS = [
  { id: 'ally-1', level: 30, name: 'Елизавета', accent: 'mist' },
  { id: 'ally-2', level: 30, name: 'Рыжая', accent: 'sunset' },
  { id: 'ally-3', level: 30, name: 'Julia', accent: 'rose' },
  { id: 'ally-4', level: 30, name: 'Наталия', accent: 'river' },
  { id: 'ally-5', level: 30, name: 'Марина', accent: 'mint' },
  { id: 'ally-6', level: 30, name: 'Игорь', accent: 'night' },
] as const;

const FOOTER_TABS: Array<{ id: MetaTab; label: string }> = [
  { id: 'news', label: 'Новости' },
  { id: 'faq', label: 'F.A.Q' },
  { id: 'fanclub', label: 'Фан-клуб' },
  { id: 'help', label: 'Помощь' },
];

export function BottomTray({
  activeTab,
  onSelectTab,
}: {
  activeTab: MetaTab;
  onSelectTab: (tab: MetaTab) => void;
}) {
  return (
    <footer className="shell-reset-bottom-strip lov-bottom-strip" data-testid="bottom-tray">
      <div className="lov-friends-band" data-testid="friend-carousel">
        <div className="lov-friends-nav left" aria-hidden="true">
          <button type="button">‹</button>
          <button type="button">«</button>
        </div>

        <div className="lov-friends-cards-viewport">
          <div className="lov-friends-cards">
            {FRIENDS.map((friend, index) => (
              <button
                key={friend.id}
                className={`lov-friend-card ${index === 2 || index === 4 ? 'featured' : ''}`}
                type="button"
                aria-label={`Друг ${friend.name}`}
              >
                <small>{friend.level} уровень</small>
                <span className={`lov-friend-portrait accent-${friend.accent}`}>
                  {friend.name.slice(0, 1)}
                </span>
                <strong>{friend.name}</strong>
              </button>
            ))}
          </div>
        </div>

        <div className="lov-friends-nav right" aria-hidden="true">
          <button type="button">›</button>
          <button type="button">»</button>
        </div>

        <button type="button" className="lov-invite-card">
          <span>Позвать друзей</span>
          <i>+</i>
        </button>
      </div>

      <div className="shell-reset-news-tabs lov-footer-tabs">
        {FOOTER_TABS.map((tab) => (
          <button
            key={tab.id}
            className={`shell-reset-news-tab ${activeTab === tab.id ? 'active' : ''}`}
            type="button"
            onClick={() => onSelectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </footer>
  );
}
