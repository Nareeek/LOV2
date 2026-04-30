import { useRef } from 'react';
import type { MetaTab } from '../../game/types.js';

const FRIENDS = [
  { id: 'ally-1', level: 30, name: 'Елизавета', accent: 'mist' },
  { id: 'ally-2', level: 30, name: 'Рыжая', accent: 'sunset' },
  { id: 'ally-3', level: 30, name: 'Julia', accent: 'rose' },
  { id: 'ally-4', level: 30, name: 'Наталия', accent: 'river' },
  { id: 'ally-5', level: 30, name: 'Марина', accent: 'mint' },
  { id: 'ally-6', level: 30, name: 'Игорь', accent: 'night' },
  { id: 'ally-7', level: 29, name: 'Елена', accent: 'mist' },
  { id: 'ally-8', level: 28, name: 'Анна', accent: 'rose' },
  { id: 'ally-9', level: 27, name: 'Armen', accent: 'river' },
  { id: 'ally-10', level: 26, name: 'Hovhannes', accent: 'night' },
  { id: 'ally-11', level: 25, name: 'Лилит', accent: 'mint' },
  { id: 'ally-12', level: 24, name: 'Сона', accent: 'sunset' },
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
  const friendsViewportRef = useRef<HTMLDivElement>(null);

  function scrollFriends(direction: -1 | 1, page = false) {
    friendsViewportRef.current?.scrollBy({
      left: direction * (page ? 620 : 180),
      behavior: 'smooth',
    });
  }

  return (
    <footer className="shell-reset-bottom-strip lov-bottom-strip" data-testid="bottom-tray">
      <div className="lov-friends-band" data-testid="friend-carousel">
        <div className="lov-friends-nav left">
          <button type="button" aria-label="Предыдущий друг" onClick={() => scrollFriends(-1)}>
            ‹
          </button>
          <button type="button" aria-label="Предыдущая страница друзей" onClick={() => scrollFriends(-1, true)}>
            «
          </button>
        </div>

        <div className="lov-friends-cards-viewport" ref={friendsViewportRef}>
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

        <div className="lov-friends-nav right">
          <button type="button" aria-label="Следующий друг" onClick={() => scrollFriends(1)}>
            ›
          </button>
          <button type="button" aria-label="Следующая страница друзей" onClick={() => scrollFriends(1, true)}>
            »
          </button>
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
