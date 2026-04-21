import type {
  BootstrapState,
  Character,
  CombatEncounter,
  InventoryStack,
  QuestDefinition,
  StatKey,
  TravelTask,
} from '@lov2/shared';
import { STAT_KEYS } from '@lov2/game-data';
import { assetPath } from '../../game/assets.js';
import type { GameIntent, GameOverlayId, RouteState } from '../../game/types.js';
import { ItemChip } from './ui.js';

const EQUIPMENT_SLOTS = ['weapon', 'helmet', 'armor', 'gloves', 'boots', 'amulet', 'ring', 'pet'] as const;

export function panelTitle(overlay: Exclude<GameOverlayId, 'none'>): string {
  switch (overlay) {
    case 'characterInfo':
      return 'Сведения о герое';
    case 'enemyInfo':
      return 'Сведения о противнике';
    case 'itemInfo':
      return 'Предмет';
    case 'petInfo':
      return 'Сведения о питомце';
    default:
      return 'Окно';
  }
}

export function NpcDialogScreen({
  state,
  overlay,
  routeStates,
  selectedQuest,
  activeTravel,
  activeTravelReady,
  clock,
  busy,
  onIntent,
}: {
  state: BootstrapState;
  overlay: GameOverlayId;
  routeStates: Record<string, RouteState>;
  selectedQuest: QuestDefinition | undefined;
  activeTravel: TravelTask | undefined;
  activeTravelReady: boolean;
  clock: number;
  busy: boolean;
  onIntent: (intent: GameIntent) => void;
}) {
  const content =
    overlay === 'taskDetail' && selectedQuest ? (
      <TaskDetailContent
        quest={selectedQuest}
        routeState={routeStates[selectedQuest.id] ?? 'locked'}
        state={state}
        busy={busy}
        onIntent={onIntent}
      />
    ) : overlay === 'travel' ? (
      <TravelContent
        state={state}
        activeTravel={activeTravel}
        activeTravelReady={activeTravelReady}
        clock={clock}
        routeStates={routeStates}
        busy={busy}
        onIntent={onIntent}
      />
    ) : (
      <TaskListContent state={state} routeStates={routeStates} onIntent={onIntent} />
    );

  return (
    <section className="screen-window npc-dialog-screen" data-testid="npc-dialog-screen">
      <header className="screen-window-head">
        <span className="window-pill">Таверна у моста</span>
        <h2>{overlay === 'taskDetail' && selectedQuest ? selectedQuest.titleRu : 'Контракты и поручения'}</h2>
      </header>
      <div className="npc-dialog-layout">
        <figure className="npc-scene-portrait">
          <img src={assetPath('scene-tavern')} alt="" />
          <figcaption>
            <strong>Хозяин таверны</strong>
            <span>Раздает контракты, слухи и маршруты на ночь.</span>
          </figcaption>
        </figure>
        <div className="npc-dialog-copy">{content}</div>
      </div>
    </section>
  );
}

export function MapStatusWindow({
  state,
  activeTravel,
  activeTravelReady,
  clock,
  routeStates,
  busy,
  onIntent,
}: {
  state: BootstrapState;
  activeTravel: TravelTask | undefined;
  activeTravelReady: boolean;
  clock: number;
  routeStates: Record<string, RouteState>;
  busy: boolean;
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <section className="map-status-window inset-window" data-testid="travel-panel">
      <header className="inset-window-head">
        <span className="window-pill">Маршруты</span>
        <strong>{activeTravel ? 'Путь в движении' : 'Выберите дорогу'}</strong>
      </header>
      <TravelContent
        state={state}
        activeTravel={activeTravel}
        activeTravelReady={activeTravelReady}
        clock={clock}
        routeStates={routeStates}
        busy={busy}
        onIntent={onIntent}
      />
    </section>
  );
}

export function CombatCommandWindow({
  pendingCombat,
  latestResolvedCombat,
  selectedEnemy,
  busy,
  visibleTurns,
  onIntent,
}: {
  pendingCombat: CombatEncounter | undefined;
  latestResolvedCombat: CombatEncounter | undefined;
  selectedEnemy: BootstrapState['enemies'][number] | undefined;
  busy: boolean;
  visibleTurns: NonNullable<CombatEncounter['log']>['turns'];
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <section className="combat-command-window inset-window" data-testid="combat-command-panel">
      {pendingCombat ? (
        <>
          <header className="inset-window-head">
            <span className="window-pill">Дуэль</span>
            <strong>{selectedEnemy?.boss ? 'Боссовый вызов' : 'Противник найден'}</strong>
          </header>
          <div className="combat-callout-body">
            <h3>{selectedEnemy?.nameRu ?? pendingCombat.enemyId}</h3>
            <p>
              {selectedEnemy?.boss
                ? 'Арена готова. Перед ударом можно проверить сведения о враге и питомце.'
                : 'Серверный бой запустится после подтверждения и будет разыгран на сцене.'}
            </p>
            <button
              data-testid="resolve-combat-button"
              disabled={busy}
              onClick={() => onIntent({ type: 'resolveCombat', combatId: pendingCombat.id })}
            >
              Сразиться
            </button>
          </div>
        </>
      ) : latestResolvedCombat?.log ? (
        <>
          <header className="inset-window-head">
            <span className="window-pill">Лог боя</span>
            <strong>Разыгрываем последние удары</strong>
          </header>
          <CombatReplayContent visibleTurns={visibleTurns} />
        </>
      ) : (
        <div className="combat-callout-body">
          <strong>Арена пуста</strong>
          <p>Сначала возьмите контракт и завершите путь к противнику.</p>
        </div>
      )}
    </section>
  );
}

export function RewardScreen({
  latestResolvedCombat,
  state,
  onContinue,
}: {
  latestResolvedCombat: CombatEncounter | undefined;
  state: BootstrapState;
  onContinue: () => void;
}) {
  return (
    <section className="screen-window reward-screen" data-testid="reward-screen">
      <header className="screen-window-head centered">
        <span className="window-pill">Итоги боя</span>
        <h2>Награда получена</h2>
      </header>
      <div className="reward-screen-body">
        <RewardContent latestResolvedCombat={latestResolvedCombat} state={state} />
        <button className="reward-continue" onClick={onContinue}>
          Продолжить
        </button>
      </div>
    </section>
  );
}

export function StoreSheet({
  state,
  busy,
  onIntent,
  onCheckout,
}: {
  state: BootstrapState;
  busy: boolean;
  onIntent: (intent: GameIntent) => void;
  onCheckout: () => void;
}) {
  const character = state.character;
  const canRefillEnergy = Boolean(character && character.energy < character.maxEnergy && character.gems >= 1);

  return (
    <section className="screen-window store-sheet" data-testid="store-sheet">
      <header className="screen-window-head">
        <span className="window-pill">Лавка</span>
        <h2>Пополнение и мастерская ночи</h2>
      </header>
      <div className="store-sheet-grid" data-testid="store-popup">
        <article className="sheet-card emphasis">
          <strong>Энергия</strong>
          <span>
            Пополнение до {character?.maxEnergy ?? 0} за 1 жемчужину. Сейчас {character?.energy ?? 0}/
            {character?.maxEnergy ?? 0}.
          </span>
          <button
            disabled={busy || !canRefillEnergy}
            data-testid="refill-energy-button"
            onClick={() => onIntent({ type: 'refillEnergy' })}
          >
            Пополнить
          </button>
        </article>
        <article className="sheet-card">
          <strong>Жемчужины</strong>
          <span>Премиальная валюта идет через ledger и Stripe sandbox.</span>
          <button disabled={busy} onClick={onCheckout}>
            Stripe sandbox
          </button>
        </article>
        <article className="sheet-card">
          <strong>Лавка ремесел</strong>
          <span>Еда питомцев, расходники и улучшения кузницы придут в следующем шаге.</span>
          <button disabled>Скоро</button>
        </article>
      </div>
    </section>
  );
}

export function CharacterSheet({
  state,
  busy,
  onIntent,
}: {
  state: BootstrapState;
  busy: boolean;
  onIntent: (intent: GameIntent) => void;
}) {
  const character = state.character;
  if (!character) {
    return null;
  }

  return (
    <section className="screen-window sheet-screen" data-testid="character-sheet">
      <header className="screen-window-head">
        <span className="window-pill">Герой</span>
        <h2>Характеристики и рост</h2>
      </header>
      <div className="sheet-layout character-sheet-layout">
        <div className="sheet-card stat-column">
          <strong>Свободные очки: {character.unspentStatPoints}</strong>
          <div className="stat-list">
            {STAT_KEYS.map((stat) => (
              <button
                key={stat}
                className="stat-row"
                disabled={busy || character.unspentStatPoints <= 0}
                onClick={() => onIntent({ type: 'allocateStat', stat: stat as StatKey })}
              >
                <span>{stat}</span>
                <strong>{character.stats[stat as StatKey]}</strong>
              </button>
            ))}
          </div>
        </div>
        <div className="hero-sheet-figure">
          <div className="hero-stage-avatar">{character.name.slice(0, 1)}</div>
          <strong>{character.name}</strong>
          <span>
            Ур. {character.level} | HP {character.health}/{character.maxHealth}
          </span>
          <p>Перерождение откроется после первого полного боссового цикла вертикального среза.</p>
        </div>
        <div className="sheet-card gear-column">
          <strong>Экипировка</strong>
          <div className="gear-column-grid">
            {EQUIPMENT_SLOTS.map((slot) => (
              <GearCell key={slot} slot={slot} state={state} onIntent={onIntent} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function InventorySheet({
  state,
  onIntent,
}: {
  state: BootstrapState;
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <section className="screen-window sheet-screen" data-testid="inventory-sheet">
      <header className="screen-window-head">
        <span className="window-pill">Снаряжение</span>
        <h2>Сумка и бумажная кукла</h2>
      </header>
      <div className="sheet-layout inventory-sheet-layout">
        <div className="sheet-card gear-column">
          <strong>Надето сейчас</strong>
          <div className="gear-column-grid">
            {EQUIPMENT_SLOTS.map((slot) => (
              <GearCell key={slot} slot={slot} state={state} onIntent={onIntent} />
            ))}
          </div>
        </div>
        <div className="hero-sheet-figure inventory-center">
          <div className="hero-stage-avatar large">{state.character?.name.slice(0, 1) ?? '?'}</div>
          <strong>Снаряжение героя</strong>
          <span>Выберите предмет справа, чтобы открыть подробности и экипировать его.</span>
        </div>
        <div className="sheet-card inventory-bag" data-testid="inventory-panel">
          <strong>Сумка</strong>
          <div className="item-grid">
            {state.inventory.map((stack) => {
              const item = state.items.find((entry) => entry.id === stack.itemId);
              return (
                <button
                  key={stack.id}
                  data-testid={`inventory-item-${stack.id}`}
                  onClick={() => onIntent({ type: 'openItemInfo', inventoryStackId: stack.id })}
                >
                  <ItemChip item={item} compact />
                  <span>x{stack.quantity}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

export function PetSheet({
  state,
  onIntent,
}: {
  state: BootstrapState;
  onIntent: (intent: GameIntent) => void;
}) {
  const petStacks = state.inventory.filter((stack) => {
    const item = state.items.find((entry) => entry.id === stack.itemId);
    return item?.slot === 'pet';
  });
  const activePet = petStacks.find((stack) => stack.equippedSlot === 'pet') ?? petStacks[0];
  const activePetItem = activePet ? state.items.find((item) => item.id === activePet.itemId) : undefined;

  return (
    <section className="screen-window sheet-screen" data-testid="pet-sheet">
      <header className="screen-window-head">
        <span className="window-pill">Питомец</span>
        <h2>Спутник и сытость</h2>
      </header>
      <div className="sheet-layout pet-sheet-layout" data-testid="pets-panel">
        <div className="sheet-card pet-summary">
          <strong>Активный спутник</strong>
          {activePetItem ? (
            <>
              <ItemChip item={activePetItem} />
              <div className="info-grid">
                <span>Уровень</span>
                <strong>1</strong>
                <span>XP</span>
                <strong>0 / 10</strong>
                <span>Сытость</span>
                <strong>7 / 10</strong>
                <span>Корм</span>
                <strong>Мясной рацион</strong>
              </div>
              <button onClick={() => onIntent({ type: 'openPetInfo' })}>Подробнее</button>
            </>
          ) : (
            <p>Питомец пока не выбран. Победите босса, чтобы закрепить первого спутника.</p>
          )}
        </div>
        <div className="hero-sheet-figure pet-stage">
          <img src={assetPath('pet-wyvern')} alt="" className="pet-stage-art" />
          <strong>{activePetItem?.nameRu ?? 'Искровой виверн'}</strong>
          <span>Участвует в бою, когда помощь активирована на арене.</span>
        </div>
        <div className="sheet-card pet-roster">
          <strong>Доступные питомцы</strong>
          <div className="item-grid">
            {petStacks.length > 0 ? (
              petStacks.map((stack) => {
                const item = state.items.find((entry) => entry.id === stack.itemId);
                return (
                  <button key={stack.id} onClick={() => onIntent({ type: 'openItemInfo', inventoryStackId: stack.id })}>
                    <ItemChip item={item} compact />
                    <span>{stack.equippedSlot === 'pet' ? 'активен' : 'в резерве'}</span>
                  </button>
                );
              })
            ) : (
              <span className="empty-sheet-copy">Пока нет спутников в сумке.</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function JournalSheet({
  state,
}: {
  state: BootstrapState;
}) {
  return (
    <section className="screen-window sheet-screen" data-testid="journal-sheet">
      <header className="screen-window-head">
        <span className="window-pill">Летопись</span>
        <h2>Ход текущего вертикального среза</h2>
      </header>
      <div className="sheet-layout journal-sheet-layout" data-testid="journal-panel">
        <div className="sheet-card">
          <strong>Контракты</strong>
          <div className="journal-list">
            {state.quests.map((quest) => {
              const progress = state.questProgress.find((entry) => entry.questId === quest.id);
              return (
                <article key={quest.id} className="journal-entry">
                  <strong>{quest.titleRu}</strong>
                  <span>{progress?.status ?? 'доступно'}</span>
                </article>
              );
            })}
          </div>
        </div>
        <div className="sheet-card">
          <strong>Путешествия</strong>
          <div className="journal-list">
            {state.travels.length > 0 ? (
              state.travels.map((travel) => {
                const location = state.locations.find((entry) => entry.id === travel.locationId);
                return (
                  <article key={travel.id} className="journal-entry">
                    <strong>{location?.nameRu ?? travel.locationId}</strong>
                    <span>{travel.status}</span>
                  </article>
                );
              })
            ) : (
              <span className="empty-sheet-copy">Маршруты пока не открывались.</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export function CharacterInfoPanel({
  state,
}: {
  state: BootstrapState;
}) {
  const character = state.character;
  if (!character) {
    return null;
  }

  const race = state.races.find((entry) => entry.id === character.raceId);
  return (
    <div className="info-panel" data-testid="character-info-popup">
      <p className="modal-lead">{race?.passiveRu ?? 'Пассивная черта пока скрыта.'}</p>
      <div className="info-grid">
        <span>Уровень</span>
        <strong>{character.level}</strong>
        <span>HP</span>
        <strong>
          {character.health}/{character.maxHealth}
        </strong>
        <span>Энергия</span>
        <strong>
          {character.energy}/{character.maxEnergy}
        </strong>
        <span>Опыт</span>
        <strong>{character.experience}</strong>
      </div>
      <div className="stats-grid compact">
        {STAT_KEYS.map((stat) => (
          <span key={stat}>
            {stat}: <strong>{character.stats[stat as StatKey]}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

export function EnemyInfoPanel({
  enemy,
}: {
  enemy: BootstrapState['enemies'][number] | undefined;
}) {
  if (!enemy) {
    return <p>Противник появится после задания и пути.</p>;
  }

  return (
    <div className="info-panel" data-testid="enemy-info-popup">
      <div className="info-grid">
        <span>Имя</span>
        <strong>{enemy.nameRu}</strong>
        <span>Уровень</span>
        <strong>{enemy.level}</strong>
        <span>HP</span>
        <strong>{enemy.health}</strong>
        <span>Тип</span>
        <strong>{enemy.boss ? 'босс' : 'обычный враг'}</strong>
      </div>
      <div className="stats-grid compact">
        {STAT_KEYS.map((stat) => (
          <span key={stat}>
            {stat}: <strong>{enemy.stats[stat as StatKey]}</strong>
          </span>
        ))}
      </div>
    </div>
  );
}

export function ItemInfoPanel({
  stack,
  item,
  busy,
  onIntent,
}: {
  stack: InventoryStack | undefined;
  item: BootstrapState['items'][number] | undefined;
  busy: boolean;
  onIntent: (intent: GameIntent) => void;
}) {
  if (!stack || !item) {
    return <p>Выберите предмет на листе героя или в сумке.</p>;
  }

  return (
    <div className="info-panel" data-testid="item-info-popup">
      <ItemChip item={item} />
      <p>{item.descriptionRu}</p>
      <div className="info-grid">
        <span>Редкость</span>
        <strong>{item.rarity}</strong>
        <span>Количество</span>
        <strong>{stack.quantity}</strong>
        <span>Цена</span>
        <strong>{item.priceGold} золота</strong>
      </div>
      <button disabled={busy || !item.slot} onClick={() => onIntent({ type: 'equipItem', inventoryStackId: stack.id })}>
        Экипировать
      </button>
    </div>
  );
}

export function PetInfoPanel({
  state,
}: {
  state: BootstrapState;
}) {
  const petStack = state.inventory.find((stack) => stack.equippedSlot === 'pet');
  const petItem = petStack ? state.items.find((item) => item.id === petStack.itemId) : undefined;

  return (
    <div className="info-panel" data-testid="pet-info-popup">
      {petItem ? (
        <>
          <ItemChip item={petItem} />
          <div className="info-grid">
            <span>Уровень</span>
            <strong>1</strong>
            <span>XP</span>
            <strong>0 / 10</strong>
            <span>Сытость</span>
            <strong>7 / 10</strong>
            <span>Корм</span>
            <strong>Мясной рацион</strong>
          </div>
        </>
      ) : (
        <p>Активный питомец пока не выбран.</p>
      )}
    </div>
  );
}

export function CombatHud({
  character,
  enemy,
  characterCurrent,
  characterStart,
  enemyCurrent,
  enemyStart,
  petName,
  petAssistArmed,
  canSkip,
  onIntent,
}: {
  character: Character;
  enemy: BootstrapState['enemies'][number] | undefined;
  characterCurrent: number;
  characterStart: number;
  enemyCurrent: number;
  enemyStart: number;
  petName: string | undefined;
  petAssistArmed: boolean;
  canSkip: boolean;
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <aside className="combat-corner-ui" data-testid="combat-corner-ui" aria-label="Боевой интерфейс">
      <section className="combat-plate player">
        <div className="combat-portrait" aria-hidden="true">
          {character.name.slice(0, 1)}
        </div>
        <div>
          <strong>{character.name}</strong>
          <span>
            HP {characterCurrent}/{characterStart}
          </span>
        </div>
        <button
          data-testid="combat-player-info"
          aria-label="Информация героя в бою"
          onClick={() => onIntent({ type: 'openOverlay', overlay: 'characterInfo' })}
        >
          i
        </button>
      </section>

      <div className="combat-controls">
        <button
          className={petAssistArmed ? 'active' : ''}
          data-testid="pet-assist-button"
          onClick={() => onIntent({ type: 'togglePetAssist' })}
        >
          {petName ? `Питомец: ${petName}` : 'Питомец'}
        </button>
        {canSkip && (
          <button className="secondary" data-testid="combat-skip-button" onClick={() => onIntent({ type: 'showReward' })}>
            Пропустить
          </button>
        )}
      </div>

      <section className="combat-plate enemy">
        <button
          data-testid="combat-enemy-info"
          aria-label="Информация противника"
          onClick={() => onIntent({ type: 'openOverlay', overlay: 'enemyInfo' })}
        >
          i
        </button>
        <div>
          <strong>{enemy?.nameRu ?? 'Противник'}</strong>
          <span>
            HP {enemyCurrent}/{enemyStart}
          </span>
        </div>
        <div className="combat-portrait enemy" aria-hidden="true">
          {enemy?.boss ? 'B' : 'E'}
        </div>
      </section>
    </aside>
  );
}

function TaskListContent({
  state,
  routeStates,
  onIntent,
}: {
  state: BootstrapState;
  routeStates: Record<string, RouteState>;
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <div className="modal-list" data-testid="task-list-popup">
      {state.quests.map((quest) => {
        const progress = state.questProgress.find((entry) => entry.questId === quest.id);
        const location = state.locations.find((entry) => entry.id === quest.locationId);
        const enemy = state.enemies.find((entry) => entry.id === quest.enemyId);
        return (
          <article key={quest.id} className={`task-card ${enemy?.boss ? 'boss-contract' : ''}`}>
            <header>
              <small>
                {progress?.status ?? 'новое'} | энергия {quest.energyCost}
              </small>
              <h3>{quest.titleRu}</h3>
            </header>
            <p>{quest.descriptionRu}</p>
            <div className="task-meta">
              <span>{location?.nameRu}</span>
              <span>{enemy?.nameRu}</span>
              <span>{labelRouteState(routeStates[quest.id])}</span>
            </div>
            <button onClick={() => onIntent({ type: 'selectTask', questId: quest.id })}>Открыть</button>
          </article>
        );
      })}
    </div>
  );
}

function TaskDetailContent({
  quest,
  routeState,
  state,
  busy,
  onIntent,
}: {
  quest: QuestDefinition;
  routeState: RouteState;
  state: BootstrapState;
  busy: boolean;
  onIntent: (intent: GameIntent) => void;
}) {
  const progress = state.questProgress.find((entry) => entry.questId === quest.id);
  const location = state.locations.find((entry) => entry.id === quest.locationId);
  const enemy = state.enemies.find((entry) => entry.id === quest.enemyId);
  const canAccept = !progress || progress.status === 'available' || progress.status === 'completed';
  const canTravel = routeState === 'available';

  return (
    <div className="task-panel" data-testid="task-popup">
      <p className="modal-lead">{quest.descriptionRu}</p>
      <div className="info-grid">
        <span>Локация</span>
        <strong>{location?.nameRu ?? 'Маршрут скрыт'}</strong>
        <span>Противник</span>
        <strong>{enemy?.nameRu ?? 'Неизвестно'}</strong>
        <span>Энергия</span>
        <strong>{quest.energyCost}</strong>
        <span>Статус</span>
        <strong>{progress?.status ?? 'новое'}</strong>
      </div>
      <div className="reward-grid compact">
        <span>Опыт +{quest.reward.experience}</span>
        <span>Золото +{quest.reward.gold}</span>
        <span>Жемчужины +{quest.reward.gems}</span>
      </div>
      <div className="button-row">
        <button
          data-testid={`task-accept-${quest.id}`}
          disabled={busy || !canAccept}
          onClick={() => onIntent({ type: 'acceptTask', questId: quest.id })}
        >
          Принять
        </button>
        <button
          data-testid={`task-travel-${quest.id}`}
          disabled={busy || !canTravel}
          onClick={() => onIntent({ type: 'startTravel', questId: quest.id, locationId: quest.locationId })}
        >
          Отправиться
        </button>
      </div>
    </div>
  );
}

function TravelContent({
  state,
  activeTravel,
  activeTravelReady,
  clock,
  routeStates,
  busy,
  onIntent,
}: {
  state: BootstrapState;
  activeTravel: TravelTask | undefined;
  activeTravelReady: boolean;
  clock: number;
  routeStates: Record<string, RouteState>;
  busy: boolean;
  onIntent: (intent: GameIntent) => void;
}) {
  if (activeTravel) {
    const location = state.locations.find((entry) => entry.id === activeTravel.locationId);
    const total = Math.max(1, new Date(activeTravel.completesAt).getTime() - new Date(activeTravel.startedAt).getTime());
    const current = Math.max(0, Math.min(total, clock - new Date(activeTravel.startedAt).getTime()));
    const progress = Math.round((current / total) * 100);
    const secondsLeft = Math.max(0, Math.ceil((new Date(activeTravel.completesAt).getTime() - clock) / 1000));

    return (
      <div className="travel-panel-inner">
        <p>{location?.descriptionRu ?? 'Маршрут скрывается в тумане.'}</p>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <strong>{activeTravelReady ? 'Маршрут завершен' : `Осталось ${secondsLeft} сек.`}</strong>
        <button
          data-testid="claim-travel-button"
          disabled={busy || !activeTravelReady}
          onClick={() => onIntent({ type: 'claimTravel', travelId: activeTravel.id })}
        >
          Забрать встречу
        </button>
      </div>
    );
  }

  return (
    <div className="modal-list">
      {state.quests.map((quest) => (
        <article key={quest.id} className="route-card" data-testid={`route-${quest.locationId}`}>
          <strong>{quest.titleRu}</strong>
          <span>
            {state.locations.find((entry) => entry.id === quest.locationId)?.nameRu} | {labelRouteState(routeStates[quest.id])}
          </span>
        </article>
      ))}
    </div>
  );
}

function CombatReplayContent({
  visibleTurns,
}: {
  visibleTurns: NonNullable<CombatEncounter['log']>['turns'];
}) {
  return (
    <div className="combat-replay-panel" data-testid="combat-replay-panel">
      <strong>Разыгрываем серверный лог боя</strong>
      <ol className="combat-log">
        {visibleTurns.map((turn) => (
          <li key={`${turn.turn}-${turn.actor}-${turn.damage}`}>
            {turn.actor === 'character' ? 'Герой' : 'Враг'}: {turn.damage}
            {turn.critical ? ' крит.' : ''}
          </li>
        ))}
      </ol>
    </div>
  );
}

function RewardContent({
  latestResolvedCombat,
  state,
}: {
  latestResolvedCombat: CombatEncounter | undefined;
  state: BootstrapState;
}) {
  const log = latestResolvedCombat?.log;
  if (!log) {
    return <p>Награда появится после завершенной дуэли.</p>;
  }

  return (
    <div className="reward-panel" data-testid="reward-panel">
      <div className={`result-seal ${log.winner === 'character' ? 'won' : 'lost'}`}>
        {log.winner === 'character' ? 'Победа' : 'Поражение'}
      </div>
      <div className="reward-grid">
        <span>Опыт +{log.reward.experience}</span>
        <span>Золото +{log.reward.gold}</span>
        <span>Жемчужины +{log.reward.gems}</span>
      </div>
      {log.reward.itemIds.length > 0 && (
        <div className="item-strip">
          {log.reward.itemIds.map((itemId) => (
            <ItemChip key={itemId} item={state.items.find((entry) => entry.id === itemId)} />
          ))}
        </div>
      )}
      <p className="modal-lead">Питомец получает 1 XP за участие в бою на следующем этапе системы.</p>
    </div>
  );
}

function GearCell({
  slot,
  state,
  onIntent,
}: {
  slot: (typeof EQUIPMENT_SLOTS)[number];
  state: BootstrapState;
  onIntent: (intent: GameIntent) => void;
}) {
  const stack = state.inventory.find((entry) => entry.equippedSlot === slot);
  const item = stack ? state.items.find((entry) => entry.id === stack.itemId) : undefined;

  return (
    <button
      className="gear-cell"
      onClick={() => stack && onIntent({ type: 'openItemInfo', inventoryStackId: stack.id })}
    >
      <small>{slot}</small>
      {item ? <ItemChip item={item} compact /> : <span>пусто</span>}
    </button>
  );
}

function labelRouteState(routeState: RouteState | undefined) {
  switch (routeState) {
    case 'ready':
      return 'готово';
    case 'traveling':
      return 'в пути';
    case 'available':
      return 'доступно';
    default:
      return 'закрыто';
  }
}
