import type { Character } from '@lov2/shared';
import type { GameIntent } from '../../game/types.js';
import { Meter } from './ui.js';

export function HudFrame({
  character,
  raceName,
  xpTarget,
  xpPercent,
  onIntent,
  onLogout,
  busy,
  message,
}: {
  character: Character;
  raceName: string;
  xpTarget: number;
  xpPercent: number;
  onIntent: (intent: GameIntent) => void;
  onLogout: () => void;
  busy: boolean;
  message: string;
}) {
  return (
    <header className="stage-topbar" data-testid="game-topbar">
      <section className="hud-portrait-cluster" data-testid="character-cluster" aria-label="Герой">
        <button
          className="character-orb"
          data-testid="character-portrait"
          aria-label="Открыть героя и экипировку"
          onClick={() => onIntent({ type: 'openScene', sceneId: 'character' })}
        >
          {character.name.slice(0, 1)}
        </button>
        <span className="level-badge" data-testid="level-badge">
          {character.level}
        </span>
        <button
          className="portrait-info-button"
          data-testid="character-info-button"
          aria-label="Информация о герое"
          onClick={() => onIntent({ type: 'openOverlay', overlay: 'characterInfo' })}
        >
          i
        </button>
      </section>

      <section className="hud-title-strip">
        <strong>{character.name}</strong>
        <span>{raceName}</span>
      </section>

      <section className="hud-xp-strip" data-testid="hud-xp" aria-label="Показатели героя">
        <Meter label="XP" value={character.experience} max={xpTarget} tone="xp" percent={xpPercent} />
        <Meter label="HP" value={character.health} max={character.maxHealth} tone="health" />
      </section>

      <section className="hud-resource-strip" data-testid="hud-resource-strip" aria-label="Ресурсы">
        <span data-testid="hud-gold">Золото {character.gold}</span>
        <span data-testid="hud-gems">Жемчужины {character.gems}</span>
        <button
          className="add-currency"
          data-testid="add-currency-button"
          onClick={() => onIntent({ type: 'openOverlay', overlay: 'store' })}
        >
          Добавить
        </button>
        <span data-testid="hud-energy">Энергия {character.energy}/{character.maxEnergy}</span>
      </section>

      <nav className="hud-utility-icons" aria-label="Служебные кнопки">
        <button className="utility-orb" type="button" aria-label="Лавка" onClick={() => onIntent({ type: 'openOverlay', overlay: 'store' })}>
          +
        </button>
        <button className="utility-orb" type="button" aria-label="Журнал" onClick={() => onIntent({ type: 'openScene', sceneId: 'journal' })}>
          J
        </button>
        <button className="utility-orb secondary" type="button" aria-label="Выйти" disabled={busy} onClick={onLogout}>
          x
        </button>
      </nav>

      <p className="hud-message">{message || 'Добро пожаловать в ночной двор.'}</p>
    </header>
  );
}
