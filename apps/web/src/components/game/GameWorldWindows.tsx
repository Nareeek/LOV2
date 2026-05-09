import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
} from 'react';
import { exerciseDefinitions } from '@lov2/game-data';
import {
  forgeUpgradeCost,
  statAllocationGoldCost,
  type BootstrapState,
  type CombatEncounter,
  type CombatTurn,
  type EnemyDefinition,
  type EquipmentSlot,
  type InventoryStack,
  type ItemDefinition,
  type QuestDefinition,
  type Race,
  type TravelTask,
} from '@lov2/shared';
import type { GameIntent, MetaTab, RouteState, SheetTab } from '../../game/types.js';
import { assetPath } from './assets.js';
import {
  APPEARANCE_OPTIONS,
  DRAG_STACK_TYPE,
  DRAG_STORE_ITEM_TYPE,
  EXERCISE_BRIEFS,
  JOURNAL_COPY,
  LEADERBOARD_CATEGORIES,
  LEADERBOARD_COPY,
  LEFT_SLOTS,
  META_LABELS,
  PAYMENT_OFFERS,
  PET_VARIANTS,
  PRIMARY_STATS,
  PROFILE_REWARDS,
  QUEST_HINTS,
  RIGHT_SLOTS,
  SLOT_HINTS,
  SLOT_LABELS,
  STORE_CONTRACTS,
  TOWER_HALLS,
  type AppearanceKey,
  type AppearanceOption,
  type StoreTab,
} from './GamePanels.data.js';
import {
  appearanceTitle,
  buildArmorBreakdown,
  buildCharacterTotals,
  buildDamageRange,
  buildHealthBreakdown,
  buildProfileSummaryStats,
  buildStatBreakdowns,
  buildTravelProgress,
  formatDuration,
  formatPrice,
  getBackpackStacks,
  getEquippedBySlot,
  getItemStatTags,
  orderBackpackStacks,
  readDraggedStackId,
  readDraggedStoreItemId,
  setItemHoverPosition,
  setItemHoverPositionFromFocus,
  statTitle,
  type BreakdownKey,
  type EquippedEntry,
  type StatBreakdown,
} from './GamePanels.logic.js';
import { ItemChip, Meter, UiIcon } from './ui.js';
import { WorldWindowShell } from './GameWindowShell.js';
import { InventoryGrid } from './GameCharacterPanels.js';
import { enemyAssetId, enemyDisplayName, enemyStatRows } from './enemyPresentation.js';
export function TavernWindow({
  state,
  selectedQuest,
  routeStates,
  busy,
  onClose,
  onIntent,
}: {
  state: BootstrapState;
  selectedQuest: QuestDefinition | undefined;
  routeStates: Record<string, RouteState>;
  busy: boolean;
  onClose: () => void;
  onIntent: (intent: GameIntent) => void;
}) {
  const character = state.character;
  const [hoveredQuestId, setHoveredQuestId] = useState<string | null>(null);
  const activeQuest = hoveredQuestId
    ? state.quests.find((quest) => quest.id === hoveredQuestId)
    : selectedQuest ?? state.quests[0];

  return (
    <WorldWindowShell
      title="Таверна"
      onClose={onClose}
      testId="tavern-window"
      className="lov-tavern-shell"
      size="hero"
      bodyScroll="sections"
    >
      <div className="lov-window-split lov-tavern-layout" data-testid="npc-dialog-screen">
        <section className="lov-illustration-panel lov-tavern-illustration">
          <img src={assetPath('scene-tavern')} alt="" />
          <div className="lov-speech-bubble tavernkeeper">Бур-бур</div>
          {activeQuest ? (
            <aside className="lov-quest-hover-card lov-tavern-preview-card" data-testid="task-popup">
              <h3>{activeQuest.titleRu}</h3>
              <p>{QUEST_HINTS[activeQuest.id] ?? activeQuest.descriptionRu}</p>
              <small>
                Цена: {activeQuest.energyCost} энергии · Награда: {activeQuest.reward.gold} золота ·{' '}
                {activeQuest.reward.experience} XP
              </small>
            </aside>
          ) : null}
        </section>

        <section className="lov-tavern-right">
          {character ? (
            <div className="lov-energy-block">
              <Meter
                label="⚡"
                value={character.energy}
                max={character.maxEnergy}
                tone="energy"
                displayValue={`${character.energy}`}
              />
              <p>Энергия пополняется раз в сутки</p>
              <p>Кружка эля пополнит её мгновенно</p>
              <div className="lov-energy-buy-row">
                <button
                  type="button"
                  className="lov-energy-button"
                  disabled={busy || character.energy >= character.maxEnergy || character.gems < 1}
                  onClick={() => onIntent({ type: 'refillEnergy', mode: 'cup' })}
                >
                  <strong>+5</strong>
                  <span>1 жемчужина</span>
                </button>
                <button
                  type="button"
                  className="lov-energy-button"
                  disabled={busy || character.energy >= character.maxEnergy || character.gems < 5}
                  onClick={() => onIntent({ type: 'refillEnergy', mode: 'bundle' })}
                >
                  <strong>+25</strong>
                  <span>5 жемчужин</span>
                </button>
              </div>
            </div>
          ) : null}

          <div className="lov-tavern-copy">
            <p>Страннику Рею нужна помощь,</p>
            <p>обычно он щедро за неё платит</p>
          </div>

          <div className="lov-quest-stack">
            {state.quests.map((quest) => {
              const routeState = routeStates[quest.id] ?? 'locked';
              const canTravel =
                !busy &&
                (character?.energy ?? 0) >= quest.energyCost &&
                routeState !== 'traveling' &&
                routeState !== 'ready';
              return (
                <button
                  key={quest.id}
                  type="button"
                  className={`lov-quest-row ${activeQuest?.id === quest.id ? 'active' : ''} ${canTravel ? 'can-travel' : 'locked'}`}
                  data-testid={`task-ribbon-${quest.id}`}
                  disabled={busy || !canTravel}
                  onMouseEnter={() => setHoveredQuestId(quest.id)}
                  onMouseLeave={() =>
                    setHoveredQuestId((current) => (current === quest.id ? null : current))
                  }
                  onFocus={() => setHoveredQuestId(quest.id)}
                  onBlur={() =>
                    setHoveredQuestId((current) => (current === quest.id ? null : current))
                  }
                  onClick={() =>
                    canTravel &&
                    onIntent({
                      type: 'startTravel',
                      questId: quest.id,
                      locationId: quest.locationId,
                    })
                  }
                >
                  <div className="lov-quest-row-title">
                    <strong>{quest.titleRu}</strong>
                    <span>{quest.energyCost} ⚡</span>
                  </div>
                  <div className="lov-quest-row-reward">
                    <span>Твоя награда:</span>
                    <strong>{quest.reward.gold}</strong>
                    <span>золота</span>
                    <strong>{quest.reward.experience}</strong>
                    <span>XP</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      </div>
    </WorldWindowShell>
  );
}

export function ArenaPreviewWindow({
  enemy,
  busy = false,
  onClose,
  onIntent,
}: {
  enemy: EnemyDefinition | undefined;
  busy?: boolean;
  onClose: () => void;
  onIntent: (intent: GameIntent) => void;
}) {
  if (!enemy) {
    return null;
  }

  const stats = enemyStatRows(enemy);
  const opponentName = enemyDisplayName(enemy);
  const opponentAsset = enemyAssetId(enemy);

  return (
    <WorldWindowShell
      title="Арена"
      onClose={onClose}
      testId="arena-window"
      className="lov-arena-shell"
      size="standard"
      bodyScroll="none"
      showHeaderClose={false}
    >
      <div className="lov-arena-layout">
        <section className="lov-arena-stats">
          <div className="lov-opponent-card">
            <strong>{opponentName}</strong>
            <span>{enemy.level} уровень</span>
          </div>
          <div className="lov-arena-grid">
            {stats.map((entry) => (
              <div key={entry.id} className="lov-arena-stat" data-testid={`arena-stat-${entry.id}`}>
                <span>{entry.label}</span>
                <strong>{entry.value}</strong>
              </div>
            ))}
          </div>
          <div className="lov-arena-primary-actions">
            <button
              type="button"
              className="secondary"
              data-testid="arena-switch-button"
              onClick={() => onIntent({ type: 'selectArenaEnemy', enemyId: enemy.id })}
            >
              Сменить соперника
            </button>
            <button
              type="button"
              className="lov-danger-button"
              data-testid="arena-start-button"
              disabled={busy}
              onClick={() => onIntent({ type: 'startArena', enemyId: enemy.id })}
            >
              Начать бой!
            </button>
          </div>
        </section>

        <section className="lov-arena-preview">
          <img src={assetPath(opponentAsset)} alt="" />
        </section>
      </div>

      <div className="lov-arena-toggles">
        <button type="button" className="lov-toggle-chip disabled" disabled>
          Автоматический бой
        </button>
        <button type="button" className="lov-toggle-chip disabled" disabled>
          Вызывать питомца
        </button>
      </div>
    </WorldWindowShell>
  );
}
export function StoreWindow({
  state,
  selectedStoreItem,
  selectedItemStackId,
  onClose,
  onIntent,
}: {
  state: BootstrapState;
  selectedStoreItem: ItemDefinition | undefined;
  selectedItemStackId: string | null;
  onClose: () => void;
  onIntent: (intent: GameIntent) => void;
}) {
  const [tab, setTab] = useState<StoreTab>('shop');
  const [hoveredItemId, setHoveredItemId] = useState<string | null>(selectedStoreItem?.id ?? state.items[0]?.id ?? null);
  const hoveredItem = state.items.find((item) => item.id === hoveredItemId) ?? selectedStoreItem ?? state.items[0];
  const backpack = useMemo(() => getBackpackStacks(state), [state]);
  const handleStoreDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    const itemId = readDraggedStoreItemId(event);
    if (itemId) {
      onIntent({ type: 'purchaseItem', itemId });
    }
  };

  return (
    <WorldWindowShell
      title="Магазин"
      onClose={onClose}
      testId="store-sheet"
      className={`lov-store-shell tab-${tab}`}
      size="hero"
      bodyScroll="sections"
    >
      <div className="lov-store-tabs">
        <button type="button" className={tab === 'shop' ? 'active' : ''} onClick={() => setTab('shop')}>
          Магазин
        </button>
        <button type="button" className={tab === 'work' ? 'active' : ''} onClick={() => setTab('work')}>
          Работа
        </button>
        <button type="button" className={tab === 'contracts' ? 'active' : ''} onClick={() => setTab('contracts')}>
          Договоры
        </button>
        <div className="lov-store-currency">
          <span>{state.character?.gold ?? 0}</span>
          <span>{state.character?.gems ?? 0}</span>
        </div>
      </div>

      {tab === 'shop' ? (
        <div className="lov-store-layout" data-testid="store-popup">
          <section
            className="lov-bag-panel lov-store-bag-panel"
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleStoreDrop}
          >
            <h3>Рюкзак</h3>
            <InventoryGrid
              state={state}
              stacks={backpack}
              selectedStackId={selectedItemStackId}
              onSelect={() => undefined}
              dataTestId="inventory-panel"
              fillSlots={24}
            />
          </section>

          <section className="lov-merchant-panel">
            <div className="lov-store-scene-card">
              <div className="lov-merchant-illustration">
                <img src={assetPath('scene-hub')} alt="" />
                <div className="lov-speech-bubble merchant">Шеп-шеп</div>
              </div>
              {hoveredItem ? (
                <div className="lov-store-hover">
                  <h4>{hoveredItem.nameRu}</h4>
                  <p>{hoveredItem.descriptionRu}</p>
                  <small>{formatPrice(hoveredItem)}</small>
                  <div className="lov-item-stat-tags">
                    {getItemStatTags(hoveredItem).map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
            <div className="lov-store-stock-panel">
              <strong>Товары лавки</strong>
              <div className="lov-merchant-grid">
                {state.items.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    draggable
                    className={`lov-merchant-item ${hoveredItem?.id === item.id ? 'active' : ''}`}
                    data-testid={`store-item-${item.id}`}
                    title={item.descriptionRu}
                    onMouseEnter={() => setHoveredItemId(item.id)}
                    onFocus={() => setHoveredItemId(item.id)}
                    onClick={() => onIntent({ type: 'purchaseItem', itemId: item.id })}
                    onDragStart={(event) => {
                      event.dataTransfer.effectAllowed = 'copy';
                      event.dataTransfer.setData(DRAG_STORE_ITEM_TYPE, item.id);
                    }}
                  >
                    <ItemChip item={item} compact />
                    <small className="lov-merchant-item-price">{formatPrice(item)}</small>
                    <span className="lov-merchant-item-action">Перетащи или купи</span>
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="lov-refresh-button secondary" disabled>
              Обновить магазин · 1 жемчужина
            </button>
          </section>
        </div>
      ) : null}

      {tab === 'work' ? (
        <div className="lov-work-layout">
          <div className="lov-work-banner">
            <p>Твоя зарплата зависит от количества друзей-помощников</p>
            <div className="lov-bonus-strip">
              {['×1', '×2', '×3', '×4', '×5', '×6'].map((label) => (
                <span key={label}>{label}</span>
              ))}
              <strong>Текущий бонус ×7</strong>
            </div>
            <div className="lov-friends-bonus">Друзей: 762</div>
          </div>
          <div className="lov-work-main">
            <div className="lov-work-illustration">
              <img src={assetPath('scene-hub')} alt="" />
            </div>
            <div className="lov-work-card">
              <h3>Присмотреть за магазином</h3>
              <p>Твоя зарплата:</p>
              <strong>3024 золота</strong>
              <div className="lov-progress-card">
                <span>До окончания работы:</span>
                <Meter label="⌛" value={45165} max={90000} tone="xp" displayValue="07:32:45" />
              </div>
              <button type="button" className="lov-danger-button" disabled>
                Прервать работу
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'contracts' ? (
        <div className="lov-contracts-layout">
          <h3>Заходи в игру каждый день и получай жемчуг!</h3>
          <div className="lov-contract-list">
            {STORE_CONTRACTS.map((contract) => (
              <article key={contract.title} className="lov-contract-card">
                <div className="lov-contract-top">
                  <strong>{contract.title}</strong>
                  <span>{contract.price}</span>
                </div>
                <div className="lov-contract-bottom">
                  <span>Твоя прибыль:</span>
                  <strong>{contract.profit}</strong>
                </div>
              </article>
            ))}
          </div>
          <p>Друг мой! Сделай вклад в моё дело и получай прибыль каждый день!</p>
        </div>
      ) : null}
    </WorldWindowShell>
  );
}

export function PaymentWindow({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <WorldWindowShell
      title="Пополнение"
      onClose={onClose}
      testId="payment-window"
      className="lov-payment-shell"
      size="standard"
      bodyScroll="none"
    >
      <div className="lov-payment-layout">
        <section className="lov-payment-hero-card">
          <strong>Добавить валюту</strong>
          <p>Здесь покупаются золото и жемчуг. Это отдельное окно оплаты, не магазин вещей.</p>
        </section>

        <section className="lov-payment-grid">
          {PAYMENT_OFFERS.map((offer) => (
            <article key={offer.id} className={`lov-payment-card tone-${offer.tone}`}>
              <div className="lov-payment-card-top">
                <strong>{offer.title}</strong>
                <span>{offer.price}</span>
              </div>
              <p>{offer.note}</p>
              <button type="button" className="lov-payment-select" disabled>
                Скоро
              </button>
            </article>
          ))}
        </section>
      </div>
    </WorldWindowShell>
  );
}

export function ForgeWindow({
  state,
  selectedForgeStack,
  onClose,
  onIntent,
}: {
  state: BootstrapState;
  selectedForgeStack: InventoryStack | undefined;
  onClose: () => void;
  onIntent: (intent: GameIntent) => void;
}) {
  const forgeableStacks = useMemo(
    () =>
      state.inventory.filter((stack) => {
        const item = state.items.find((entry) => entry.id === stack.itemId);
        return Boolean(item?.forgeable && item.slot !== 'pet');
      }),
    [state],
  );
  const activeForgeStack = selectedForgeStack ?? forgeableStacks[0];
  const selectedItem = activeForgeStack
    ? state.items.find((entry) => entry.id === activeForgeStack.itemId)
    : undefined;
  const upgradeCost = selectedItem && activeForgeStack ? forgeUpgradeCost(selectedItem, activeForgeStack.enhancementLevel ?? 0) : 0;

  useEffect(() => {
    if (!selectedForgeStack && forgeableStacks[0]) {
      onIntent({ type: 'selectForgeItem', inventoryStackId: forgeableStacks[0].id });
    }
  }, [forgeableStacks, onIntent, selectedForgeStack]);

  return (
    <WorldWindowShell
      title="Кузница"
      onClose={onClose}
      testId="forge-window"
      className="lov-forge-shell"
      size="hero"
      bodyScroll="sections"
    >
      <div className="lov-store-layout lov-forge-layout">
        <section className="lov-bag-panel lov-forge-bag-panel">
          <h3>Снаряжение</h3>
          <p className="lov-forge-bag-hint">Выбери оружие, броню или украшение. Можно перетащить вещь на наковальню.</p>
          <InventoryGrid
            state={state}
            stacks={forgeableStacks}
            selectedStackId={activeForgeStack?.id ?? null}
            onSelect={(inventoryStackId) => onIntent({ type: 'selectForgeItem', inventoryStackId })}
            dataTestId="forge-inventory-panel"
            draggable
            fillSlots={24}
          />
        </section>

        <section className="lov-forge-panel">
          <div className="lov-forge-currency">
            <span>{state.character?.gold ?? 0} золота</span>
            <span>{state.character?.gems ?? 0} жемчуга</span>
          </div>
          <div className="lov-forge-workbench">
            <div className="lov-forge-illustration">
              <img src={assetPath('ui-hotspot-map-forge')} alt="" />
              <div className="lov-speech-bubble forge">Тук-тук</div>
            </div>

            <div className="lov-forge-upgrade-card">
              <div
                className={`lov-anvil-slot ${selectedItem ? 'filled' : ''}`}
                data-testid="forge-anvil-slot"
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const inventoryStackId = readDraggedStackId(event);
                  if (inventoryStackId) {
                    onIntent({ type: 'selectForgeItem', inventoryStackId });
                  }
                }}
              >
                {selectedItem ? <ItemChip item={selectedItem} /> : <span>Перетащи предмет на наковальню</span>}
              </div>

              <div className="lov-forge-instruction">
                {selectedItem ? (
                  <>
                    <strong>{selectedItem.nameRu}</strong>
                    <span>Уровень: +{activeForgeStack?.enhancementLevel ?? 0}</span>
                    <span>Стоимость: {upgradeCost} золота</span>
                    <div className="lov-item-stat-tags">
                      {getItemStatTags(selectedItem, activeForgeStack?.enhancementLevel ?? 0).map((tag) => (
                        <span key={tag}>{tag}</span>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <strong>Выбери предмет</strong>
                    <span>Оружие, броня и украшения усиливаются здесь.</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="lov-forge-upgrade-button"
            data-testid="forge-upgrade-button"
            disabled={!activeForgeStack}
            onClick={() => activeForgeStack && onIntent({ type: 'upgradeItem', inventoryStackId: activeForgeStack.id })}
          >
            Улучшить
          </button>
        </section>
      </div>
    </WorldWindowShell>
  );
}
export function TowerWindow({
  state,
  onClose,
}: {
  state: BootstrapState;
  onClose: () => void;
}) {
  const bossUnlocked = state.character ? state.character.level >= 5 : false;

  return (
    <WorldWindowShell
      title="Темная башня"
      onClose={onClose}
      testId="tower-window"
      className="lov-tower-shell"
      size="standard"
      bodyScroll="none"
    >
      <div className="lov-tower-grid">
        {TOWER_HALLS.map((hall) => {
          const locked = hall.locked && !bossUnlocked;
          const percent = hall.total > 0 ? Math.round((hall.progress / hall.total) * 100) : 0;
          return (
            <article key={hall.id} className={`lov-tower-card ${locked ? 'locked' : ''}`}>
              <h3>{hall.title}</h3>
              <div className="lov-tower-card-image">
                <img src={assetPath(hall.image)} alt="" />
                {hall.completed ? <span className="lov-tower-mark">✓</span> : null}
                {locked ? <span className="lov-tower-lock">🔒</span> : null}
              </div>
              {locked ? (
                <div className="lov-tower-progress locked">Нужен ключ!</div>
              ) : (
                <div className="lov-tower-progress">
                  <i style={{ width: `${percent}%` }} />
                  <span>Пройдено: {hall.progress}/{hall.total}</span>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </WorldWindowShell>
  );
}

export function BoatmanWindow({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <WorldWindowShell
      title="Лодочник"
      onClose={onClose}
      testId="boatman-window"
      className="lov-boatman-shell"
      size="standard"
      bodyScroll="none"
    >
      <div className="lov-window-split lov-boatman-layout">
        <section className="lov-illustration-panel lov-boatman-illustration">
          <img src={assetPath('scene-map')} alt="" />
          <div className="lov-speech-bubble boatman">ホコホコ</div>
          <button type="button" className="lov-dice-button secondary" disabled>
            Сыграть в кости
          </button>
        </section>
        <section className="lov-window-copy lov-boatman-copy">
          <p className="lov-boatman-lead">Старик Тору отвезёт тебя хоть на край света</p>
          <div className="lov-boatman-card">
            <button type="button" disabled>
              Остров Ужаса · 1 жемчужина
            </button>
            <small>Новые земли ждут тебя!</small>
          </div>
        </section>
      </div>
    </WorldWindowShell>
  );
}

export function FountainWindow({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <WorldWindowShell
      title="Фонтан"
      onClose={onClose}
      testId="fountain-window"
      className="lov-fountain-shell"
      size="standard"
      bodyScroll="none"
    >
      <div className="lov-fountain-layout">
        <div className="lov-fountain-rules">
          Каждый раз, когда ты бросаешь в фонтан горсть монет, у тебя есть шанс получить ауру. Та раса, что пожертвует
          больше золота Духу фонтана сегодня, будет награждена особой аурой на следующий день.
        </div>
        <div className="lov-fountain-main">
          <div className="lov-fountain-glow" />
          <h3>Сегодня Дух фонтана благоволит Вампирам</h3>
          <p>Брось горсть монет, чтобы получить капли крови</p>
          <div className="lov-fountain-timer">
            <span>Благословение рассеется через:</span>
            <strong>00:07:59</strong>
          </div>
          <button type="button" className="lov-donation-button" disabled>
            Бросить горсть монет · 1350 золота
          </button>
        </div>
      </div>
    </WorldWindowShell>
  );
}

export function ExerciseDetailWindow({
  exerciseId,
  onClose,
}: {
  exerciseId: string | null;
  onClose: () => void;
}) {
  const exercise = exerciseDefinitions.find((entry) => entry.id === exerciseId) ?? exerciseDefinitions[0];
  if (!exercise) {
    return null;
  }

  const brief = EXERCISE_BRIEFS[exercise.id] ?? EXERCISE_BRIEFS['courtyard-lanterns']!;

  return (
    <WorldWindowShell
      title="Новое задание"
      onClose={onClose}
      testId="exercise-detail-window"
      className="lov-quest-shell"
      size="compact"
      bodyScroll="none"
    >
      <div className="lov-window-split lov-quest-layout">
        <section className="lov-illustration-panel lov-quest-illustration">
          <img src={assetPath('scene-tavern')} alt="" />
          <div className="lov-speech-bubble tavernkeeper">クドクド</div>
        </section>
        <section className="lov-window-copy lov-quest-copy">
          <h3>{brief.title}</h3>
          <p>{brief.intro}</p>
          <div className="lov-quest-objective">
            <span>Задание:</span>
            <strong>{brief.objective}</strong>
          </div>
          <div className="lov-quest-objective">
            <span>Ты получишь:</span>
            <strong>
              {brief.gold} золота · {brief.experience} XP
            </strong>
          </div>
        </section>
      </div>
    </WorldWindowShell>
  );
}

export function LeaderboardWindow({
  state,
  onClose,
}: {
  state: BootstrapState;
  onClose: () => void;
}) {
  const heroName = state.character?.name ?? 'Ты';

  return (
    <WorldWindowShell
      title="Мировой рейтинг"
      onClose={onClose}
      testId="leaderboard-window"
      className="lov-leaderboard-shell"
      size="standard"
      bodyScroll="body"
    >
      <div className="lov-leaderboard-grid">
        {LEADERBOARD_CATEGORIES.map((category) => (
          <section key={category.id} className="lov-leaderboard-card">
            <header className="lov-leaderboard-card-header">
              <strong>{category.title}</strong>
              <span>{category.metric}</span>
            </header>
            <div className="lov-leaderboard-list">
              {category.entries.map((entry, index) => {
                const isHero = entry.name === heroName || entry.name === 'Даррид';
                return (
                  <article key={`${category.id}-${entry.name}`} className={`lov-leaderboard-entry ${isHero ? 'is-hero' : ''}`}>
                    <b>{index + 1}</b>
                    <strong>{isHero ? heroName : entry.name}</strong>
                    <span>{entry.value}</span>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </WorldWindowShell>
  );
}

export function WorldLeaderboardWindow({
  state,
  onClose,
}: {
  state: BootstrapState;
  onClose: () => void;
}) {
  const heroName = state.character?.name ?? LEADERBOARD_COPY.heroName;

  return (
    <WorldWindowShell
      title={LEADERBOARD_COPY.title}
      onClose={onClose}
      testId="leaderboard-window"
      className="lov-leaderboard-shell"
      size="standard"
      bodyScroll="body"
    >
      <div className="lov-leaderboard-grid">
        {LEADERBOARD_CATEGORIES.map((category, categoryIndex) => {
          const categoryCopy = LEADERBOARD_COPY.categories[categoryIndex] ?? LEADERBOARD_COPY.categories[0];

          return (
            <section key={category.id} className="lov-leaderboard-card">
              <header className="lov-leaderboard-card-header">
                <strong>{categoryCopy.title}</strong>
                <span>{categoryCopy.metric}</span>
              </header>
              <div className="lov-leaderboard-list">
                {category.entries.map((entry, index) => {
                  const displayName = categoryCopy.entries[index] ?? entry.name;
                  const isHero = displayName === heroName || entry.name === heroName;

                  return (
                    <article key={`${category.id}-${entry.name}`} className={`lov-leaderboard-entry ${isHero ? 'is-hero' : ''}`}>
                      <b>{index + 1}</b>
                      <strong>{isHero ? heroName : displayName}</strong>
                      <span>{entry.value}</span>
                    </article>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </WorldWindowShell>
  );
}

export function JournalWindow({
  activeTab,
  onClose,
}: {
  activeTab: MetaTab;
  onClose: () => void;
}) {
  const cards = JOURNAL_COPY[activeTab];

  return (
    <WorldWindowShell
      title={META_LABELS[activeTab]}
      onClose={onClose}
      testId="journal-window"
      className="lov-journal-shell"
      size="standard"
      bodyScroll="body"
    >
      <div className="lov-journal-cards">
        {cards.map((card) => (
          <article key={card.title} className="lov-journal-card">
            <h3>{card.title}</h3>
            <p>{card.text}</p>
          </article>
        ))}
      </div>
    </WorldWindowShell>
  );
}

export function SettingsWindow({
  onClose,
}: {
  onClose: () => void;
}) {
  return (
    <WorldWindowShell
      title="Коллекции и помощь"
      onClose={onClose}
      testId="settings-window"
      size="standard"
      bodyScroll="body"
    >
      <div className="lov-journal-cards">
        <article className="lov-journal-card">
          <h3>Коллекции</h3>
          <p>Редкие находки, наборы и подарки останутся здесь отдельными разделами.</p>
        </article>
        <article className="lov-journal-card">
          <h3>Настройки</h3>
          <p>Звук, эффекты и графическое качество можно будет закрепить в этом же окне.</p>
        </article>
      </div>
    </WorldWindowShell>
  );
}
