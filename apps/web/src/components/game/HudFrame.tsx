import type { Character } from '@lov2/shared';
import type { GameIntent } from '../../game/types.js';
import { Meter, UiIcon } from './ui.js';

export function HudFrame({
  character,
  xpTarget,
  xpPercent,
  onIntent,
}: {
  character: Character;
  xpTarget: number;
  xpPercent: number;
  onIntent: (intent: GameIntent) => void;
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
    </header>
  );
}
