import type { BootstrapState } from '@lov2/shared';
import type { GameIntent, ScreenMode } from '../../game/types.js';

const PLACEHOLDER_FRIENDS = [
  { id: 'ally-1', level: 30 },
  { id: 'ally-2', level: 29 },
  { id: 'ally-3', level: 29 },
  { id: 'ally-4', level: 28 },
  { id: 'ally-5', level: 27 },
  { id: 'ally-6', level: 22 },
] as const;

export function BottomTray({
  state,
  screenMode,
  onIntent,
}: {
  state: BootstrapState;
  screenMode: ScreenMode;
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <footer className="stage-bottom-strip bottom-tray" data-testid="bottom-tray">
      <div className="bottom-strip-copy">
        <strong>{labelForScreen(screenMode)}</strong>
        <span>
          {state.character
            ? `Ур. ${state.character.level} | энергия ${state.character.energy}/${state.character.maxEnergy}`
            : 'Социальная лента появится вместе с друзьями, кланами и подарками.'}
        </span>
      </div>

      <div className="friend-carousel" data-testid="friend-carousel">
        {PLACEHOLDER_FRIENDS.map((friend, index) => (
          <button key={friend.id} className="friend-slot" type="button" aria-label={`Друг ${index + 1}`}>
            <small>{friend.level} уровень</small>
            <span>{index + 1}</span>
          </button>
        ))}
      </div>

      <div className="bottom-strip-actions">
        <button className="secondary" type="button" onClick={() => onIntent({ type: 'openScene', sceneId: 'hub' })}>
          Во двор
        </button>
        <button type="button" onClick={() => onIntent({ type: 'openScene', sceneId: 'journal' })}>
          Позвать друзей
        </button>
      </div>
    </footer>
  );
}

function labelForScreen(screenMode: ScreenMode) {
  switch (screenMode) {
    case 'npcDialog':
      return 'Таверна и поручения';
    case 'map':
      return 'Пути и встречи';
    case 'combat':
      return 'Арена и зрители';
    case 'characterSheet':
      return 'Лист героя';
    case 'inventorySheet':
      return 'Сумка и трофеи';
    case 'petSheet':
      return 'Спутники';
    case 'journalSheet':
      return 'Летопись';
    case 'storeSheet':
      return 'Лавка';
    case 'reward':
      return 'Награда';
    default:
      return 'Ночной двор';
  }
}
