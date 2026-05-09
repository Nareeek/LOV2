import type { Character } from '@lov2/shared';
import { characterImagePath } from '../../game/characterIdentity.js';
import type { GameIntent } from '../../game/types.js';
import { assetPath } from './assets.js';
import { Meter, UiIcon } from './ui.js';

export function HudFrame({
  character,
  xpTarget,
  xpPercent,
  onIntent,
  onLogout,
}: {
  character: Character;
  xpTarget: number;
  xpPercent: number;
  onIntent: (intent: GameIntent) => void;
  onLogout: () => Promise<void> | void;
}) {
  return (
    <header className="shell-reset-topbar lov-topbar" data-testid="game-topbar">
      <section className="lov-topbar-left">
        <div className="shell-reset-hero-cluster lov-topbar-portrait" data-testid="character-cluster">
          <button
            className="shell-reset-portrait"
            data-testid="character-portrait"
            aria-label="Открыть окно героя"
            onClick={() => onIntent({ type: 'openSheet', tab: 'character' })}
          >
            <img src={characterImagePath(character)} alt="" data-testid="character-portrait-image" />
          </button>
          <span className="shell-reset-level" data-testid="level-badge">
            {character.level}
          </span>
          <button
            className="shell-reset-info lov-topbar-badge"
            data-testid="character-info-button"
            aria-label="Сведения о герое"
            onClick={() => onIntent({ type: 'openInfo', windowId: 'heroInfo' })}
          >
            <UiIcon name="info" />
          </button>
        </div>
      </section>

      <section className="lov-topbar-center">
        <strong className="lov-topbar-character-name" data-testid="topbar-character-name">
          {character.name}
        </strong>
        <div className="shell-reset-progress lov-xp-strip" data-testid="hud-xp">
          <Meter
            label="XP"
            value={character.experience}
            max={xpTarget}
            tone="xp"
            percent={xpPercent}
            displayValue={`${character.experience}/${xpTarget}`}
          />
        </div>
      </section>

      <section className="shell-reset-resource-strip lov-resource-strip" data-testid="hud-resource-strip">
        <div className="lov-resource-pill" data-testid="hud-gold">
          <img src={assetPath('icon-gold-coin')} alt="" />
          <span>{character.gold}</span>
        </div>
        <div className="lov-resource-pill" data-testid="hud-gems">
          <img src={assetPath('icon-moon-gem')} alt="" />
          <span>{character.gems}</span>
        </div>
        <button
          className="shell-reset-add lov-add-button"
          data-testid="add-currency-button"
          onClick={() => onIntent({ type: 'openWindow', windowId: 'payments' })}
        >
          Добавить
        </button>
        <button
          type="button"
          className="lov-leaderboard-button"
          data-testid="action-leaderboard"
          aria-label="Рейтинг"
          title="Рейтинг"
          onClick={() => onIntent({ type: 'openWindow', windowId: 'leaderboard' })}
        >
          <UiIcon name="trophy" />
        </button>
        <button
          type="button"
          className="lov-logout-button"
          data-testid="logout-button"
          aria-label="Выйти"
          title="Выйти"
          onClick={() => void onLogout()}
        >
          <UiIcon name="logout" />
        </button>
      </section>
    </header>
  );
}
