import type { Character } from '@lov2/shared';
import type { GameIntent } from '../../game/types.js';
import { Meter, UiIcon } from './ui.js';

export function HudFrame({
  character,
  raceName,
  xpTarget,
  xpPercent,
  onIntent,
  onLogout,
  busy,
}: {
  character: Character;
  raceName: string;
  xpTarget: number;
  xpPercent: number;
  onIntent: (intent: GameIntent) => void;
  onLogout: () => void;
  busy: boolean;
}) {
  const gloryLevel = Math.min(12, Math.max(1, character.level));
  const gloryCurrent = Math.min(20, 6 + character.rebirths * 2 + Math.floor(character.level / 2));

  return (
    <header className="shell-reset-topbar lov-topbar" data-testid="game-topbar">
      <section className="lov-topbar-left">
        <div className="shell-reset-hero-cluster lov-topbar-portrait" data-testid="character-cluster">
          <button
            className="shell-reset-portrait"
            data-testid="character-portrait"
            aria-label="Открыть профиль героя"
            onClick={() => onIntent({ type: 'openSheet', tab: 'profile' })}
          >
            {character.name.slice(0, 1)}
          </button>
          <span className="shell-reset-level" data-testid="level-badge">
            {character.level}
          </span>
          <button
            className="shell-reset-info lov-topbar-badge"
            data-testid="character-info-button"
            aria-label="Сведения о герое"
            onClick={() => onIntent({ type: 'openSheet', tab: 'profile' })}
          >
            <UiIcon name="info" />
          </button>
        </div>

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

        <div className="lov-glory-strip" data-testid="hud-glory-strip">
          <span>{gloryLevel}</span>
          <strong>{gloryCurrent}/20</strong>
          <i>✦</i>
        </div>
      </section>

      <section className="shell-reset-resource-strip lov-resource-strip" data-testid="hud-resource-strip">
        <div className="lov-resource-pill" data-testid="hud-gold">
          <i>◌</i>
          <span>{character.gold}</span>
        </div>
        <div className="lov-resource-pill" data-testid="hud-gems">
          <i>◍</i>
          <span>{character.gems}</span>
        </div>
        <button
          className="shell-reset-add lov-add-button"
          data-testid="add-currency-button"
          onClick={() => onIntent({ type: 'openWindow', windowId: 'store' })}
        >
          Добавить
        </button>
      </section>

      <section className="shell-reset-meta-icons lov-topbar-actions">
        <button
          className="shell-reset-meta-button"
          aria-label="Профиль"
          title={`${character.name} · ${raceName}`}
          onClick={() => onIntent({ type: 'openSheet', tab: 'profile' })}
        >
          <UiIcon name="hero" />
        </button>
        <button
          className="shell-reset-meta-button"
          aria-label="Внешность"
          onClick={() => onIntent({ type: 'openSheet', tab: 'appearance' })}
        >
          <UiIcon name="journal" />
        </button>
        <button
          className="shell-reset-meta-button"
          aria-label="Питомцы"
          onClick={() => onIntent({ type: 'openSheet', tab: 'pets' })}
        >
          <UiIcon name="pets" />
        </button>
        <button
          className="shell-reset-meta-button"
          aria-label="Журнал"
          onClick={() => onIntent({ type: 'openWindow', windowId: 'journal' })}
        >
          <UiIcon name="gift" />
        </button>
        <button
          className="shell-reset-meta-button secondary"
          aria-label="Выйти"
          disabled={busy}
          onClick={onLogout}
        >
          <UiIcon name="logout" />
        </button>
      </section>
    </header>
  );
}
