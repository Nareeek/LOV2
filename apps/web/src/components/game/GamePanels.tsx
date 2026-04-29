import {
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type DragEvent,
  type FocusEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';
import { exerciseDefinitions } from '@lov2/game-data';
import {
  armorFromEquipment,
  forgeUpgradeCost,
  itemArmorWithEnhancement,
  itemStatsWithEnhancement,
  maxHealthForStats,
  statAllocationGoldCost,
  statsWithEquipment,
  type BootstrapState,
  type CharacterStats,
  type CombatEncounter,
  type CombatTurn,
  type EnemyDefinition,
  type EquipmentSlot,
  type InventoryStack,
  type ItemDefinition,
  type QuestDefinition,
  type Race,
  type StatKey,
  type TravelTask,
} from '@lov2/shared';
import { assetPath } from './assets.js';
import type { GameIntent, MetaTab, RouteState, SheetTab } from '../../game/types.js';
import { ItemChip, Meter, UiIcon } from './ui.js';

type EquippedEntry = { stack: InventoryStack; item: ItemDefinition };
type BreakdownKey = StatKey | 'health' | 'armor';
type StatBreakdownLine = {
  label: string;
  value: string;
  tone?: 'total';
};
type StatBreakdown = {
  key: BreakdownKey;
  title: string;
  details?: StatBreakdownLine[];
  base?: number;
  manual?: number;
  equipment?: number;
  total: number;
  derivedLabel?: string;
  derivedValue?: string;
};
type StoreTab = 'shop' | 'work' | 'contracts';
type AppearanceKey = 'face' | 'hair' | 'color';
type AppearanceOption = { id: string; label: string; swatch?: string; imageAssetId?: string };
type WindowSize = 'compact' | 'standard' | 'wide' | 'hero';
type WindowBodyScroll = 'none' | 'body' | 'sections';

const DRAG_STACK_TYPE = 'application/x-lov2-stack';
const DRAG_STORE_ITEM_TYPE = 'application/x-lov2-store-item';
const STAT_STRENGTH = '\u0441\u0438\u043b\u0430' as StatKey;
const STAT_AGILITY = '\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c' as StatKey;
const STAT_INTUITION = '\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f' as StatKey;
const STAT_LUCK = '\u0443\u0434\u0430\u0447\u0430' as StatKey;
const LEFT_SLOTS: EquipmentSlot[] = ['weapon', 'ring', 'amulet', 'pet'];
const RIGHT_SLOTS: EquipmentSlot[] = ['helmet', 'armor', 'gloves', 'boots'];
const PRIMARY_STATS: StatKey[] = [STAT_STRENGTH, STAT_AGILITY, STAT_INTUITION, STAT_LUCK];
const SLOT_HINTS: Record<EquipmentSlot, string> = {
  weapon: '⚔',
  helmet: '⌂',
  armor: '▣',
  gloves: '✋',
  boots: '⌵',
  amulet: '◈',
  ring: '◌',
  pet: '✦',
};
const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Оружие',
  helmet: 'Шлем',
  armor: 'Броня',
  gloves: 'Перчатки',
  boots: 'Обувь',
  amulet: 'Амулет',
  ring: 'Кольцо',
  pet: 'Питомец',
};
const META_LABELS: Record<MetaTab, string> = {
  news: 'Новости',
  faq: 'F.A.Q',
  fanclub: 'Фан-клуб',
  help: 'Помощь',
};
const CLASS_BONUSES: Record<string, Partial<CharacterStats>> = {
  swordsman: { [STAT_STRENGTH]: 2 },
  ranger: { [STAT_AGILITY]: 2 },
  mage: { [STAT_INTUITION]: 2 },
};
const APPEARANCE_OPTIONS: Record<AppearanceKey, AppearanceOption[]> = {
  face: [
    { id: 'face-1', label: 'Спокойное лицо', imageAssetId: 'ui-appearance-face-card' },
    { id: 'face-2', label: 'Резкие черты', imageAssetId: 'ui-appearance-face-card' },
    { id: 'face-3', label: 'Светлый профиль', imageAssetId: 'ui-appearance-face-card' },
  ],
  hair: [
    { id: 'hair-1', label: 'Собранные пряди', imageAssetId: 'ui-appearance-hair-style' },
    { id: 'hair-2', label: 'Боевой вихрь', imageAssetId: 'ui-appearance-hair-style' },
    { id: 'hair-3', label: 'Длинные пряди', imageAssetId: 'ui-appearance-hair-style' },
  ],
  color: [
    { id: 'color-1', label: 'Светлый', swatch: '#d3bf8d', imageAssetId: 'ui-appearance-hair-color' },
    { id: 'color-2', label: 'Медный', swatch: '#a5664d', imageAssetId: 'ui-appearance-hair-color' },
    { id: 'color-3', label: 'Темный', swatch: '#37353d', imageAssetId: 'ui-appearance-hair-color' },
  ],
};
const PROFILE_REWARDS = [
  { id: 'reward-1', label: 'Печать двора', accent: 'ember' },
  { id: 'reward-2', label: 'Жемчужный знак', accent: 'moon' },
  { id: 'reward-3', label: 'Пусто', accent: 'empty' },
  { id: 'reward-4', label: 'Сумка удачи', accent: 'gold' },
  { id: 'reward-5', label: 'Игральные кости', accent: 'mint' },
  { id: 'reward-6', label: 'Пусто', accent: 'empty' },
];
const PET_VARIANTS = [
  { id: 'foxling', name: 'Лисёнок', level: 12, hp: 1800, damage: '34-35', assetId: 'pet-wolf' },
  { id: 'wyrmlet', name: 'Дракончик', level: 14, hp: 1950, damage: '36-38', assetId: 'pet-dragon' },
  { id: 'kitten', name: 'Котёнок', level: 17, hp: 2100, damage: '40-41', assetId: 'pet-cat' },
];
const STORE_CONTRACTS = [
  { title: 'Договор на сезон', price: '1000 ОК', profit: '1620 жемчужин за 90 дней' },
  { title: 'Договор на месяц', price: '250 ОК', profit: '270 жемчужин за 30 дней' },
  { title: 'Договор на 10 дней', price: '100 ОК', profit: '60 жемчужин за 10 дней' },
];
const PAYMENT_OFFERS = [
  { id: 'gold-small', title: '1000 золота', price: '$1', note: 'Для покупок в магазине и оплаты улучшений', tone: 'gold' },
  { id: 'pearls-small', title: '100 жемчужин', price: '$2', note: 'Для энергии, ускорений и редких возможностей', tone: 'pearl' },
  { id: 'gold-large', title: '6000 золота', price: '$5', note: 'Запас для кузницы и раннего снаряжения', tone: 'gold' },
  { id: 'pearls-large', title: '600 жемчужин', price: '$10', note: 'Лучший запас для длительной игры', tone: 'pearl' },
];
const LEADERBOARD_CATEGORIES = [
  {
    id: 'experience',
    title: 'Лучший опыт',
    metric: 'XP',
    entries: [
      { name: 'Леди Нокс', value: '98 440' },
      { name: 'Северный Ворон', value: '92 180' },
      { name: 'Даррид', value: '84 620' },
      { name: 'Морра', value: '81 300' },
    ],
  },
  {
    id: 'level',
    title: 'Высший уровень',
    metric: 'ур.',
    entries: [
      { name: 'Ашен', value: '36' },
      { name: 'Ингрид', value: '34' },
      { name: 'Даррид', value: '32' },
      { name: 'Эйра', value: '31' },
    ],
  },
  {
    id: 'arena',
    title: 'Слава арены',
    metric: 'побед',
    entries: [
      { name: 'Кровавый капитан', value: '412' },
      { name: 'Даррид', value: '368' },
      { name: 'Надежда', value: '341' },
      { name: 'Бернадетт', value: '319' },
    ],
  },
] as const;
const LEADERBOARD_COPY = {
  title: '\u041c\u0438\u0440\u043e\u0432\u043e\u0439 \u0440\u0435\u0439\u0442\u0438\u043d\u0433',
  heroName: '\u0422\u044b',
  categories: [
    {
      title: '\u041b\u0443\u0447\u0448\u0438\u0439 \u043e\u043f\u044b\u0442',
      metric: 'XP',
      entries: [
        '\u041b\u0435\u0434\u0438 \u041d\u043e\u043a\u0441',
        '\u0421\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u0412\u043e\u0440\u043e\u043d',
        '\u0414\u0430\u0440\u0440\u0438\u0434',
        '\u041c\u043e\u0440\u0440\u0430',
      ],
    },
    {
      title: '\u0412\u044b\u0441\u0448\u0438\u0439 \u0443\u0440\u043e\u0432\u0435\u043d\u044c',
      metric: '\u0443\u0440.',
      entries: [
        '\u0410\u0448\u0435\u043d',
        '\u0418\u043d\u0433\u0440\u0438\u0434',
        '\u0414\u0430\u0440\u0440\u0438\u0434',
        '\u042d\u0439\u0440\u0430',
      ],
    },
    {
      title: '\u0421\u043b\u0430\u0432\u0430 \u0430\u0440\u0435\u043d\u044b',
      metric: '\u043f\u043e\u0431\u0435\u0434',
      entries: [
        '\u041a\u0440\u043e\u0432\u0430\u0432\u044b\u0439 \u043a\u0430\u043f\u0438\u0442\u0430\u043d',
        '\u0414\u0430\u0440\u0440\u0438\u0434',
        '\u041d\u0430\u0434\u0435\u0436\u0434\u0430',
        '\u0411\u0435\u0440\u043d\u0430\u0434\u0435\u0442\u0442',
      ],
    },
  ],
} as const;

const TOWER_HALLS = [
  { id: 'skeletons', title: 'Зал скелетов', progress: 20, total: 20, completed: true, locked: false, image: 'scene-character' },
  { id: 'zombies', title: 'Зал зомби', progress: 15, total: 20, completed: false, locked: false, image: 'scene-hub' },
  { id: 'mummies', title: 'Зал мумий', progress: 10, total: 20, completed: false, locked: false, image: 'scene-tavern' },
  { id: 'ice', title: 'Ледяной зал', progress: 10, total: 20, completed: false, locked: false, image: 'scene-map' },
  { id: 'east', title: 'Восточный зал', progress: 10, total: 20, completed: false, locked: false, image: 'scene-journal' },
  { id: 'death', title: 'Зал смерти', progress: 0, total: 20, completed: false, locked: true, image: 'scene-combat' },
];
const JOURNAL_COPY: Record<MetaTab, Array<{ title: string; text: string }>> = {
  news: [
    { title: 'Новости двора', text: 'Свежие городские вести, редкие гости и перемены в ночном расписании.' },
    { title: 'Новый караван', text: 'Торговцы привезли лёгкое снаряжение и новые жемчужные договоры.' },
  ],
  faq: [
    { title: 'Как растёт энергия', text: 'Запас энергии обновляется в 04:00 и полностью восстанавливается при новом уровне.' },
    { title: 'Как экипировать предмет', text: 'Перетащите вещь из рюкзака на подходящий слот героя или нажмите в карточке предмета.' },
  ],
  fanclub: [
    { title: 'Фан-клуб', text: 'Здесь соберутся общие подборки, любимые билды и коллекции скриншотов.' },
    { title: 'Зал почёта', text: 'Отдельная лента для самых заметных побед и необычных образов героя.' },
  ],
  help: [
    { title: 'Помощь', text: 'Если экран ведёт себя странно, можно закрыть окно, открыть вкладку заново и продолжить с сохранённого места.' },
    { title: 'Подсказка', text: 'Сначала усиливайте экипировку и основные характеристики, а затем тратьте жемчужины на ускорение.' },
  ],
};
const EXERCISE_BRIEFS: Record<
  string,
  { title: string; intro: string; objective: string; gold: number; experience: number }
> = {
  'courtyard-lanterns': {
    title: 'Особое умение',
    intro:
      'Спорим, ты и пяти минут не сможешь отработать в моей таверне? Чтобы разливать эль, требуется много ловкости и умения!',
    objective: 'Увеличь ловкость на 5 единиц.',
    gold: 405,
    experience: 135,
  },
  'harbor-rumors': {
    title: 'Шёпот у пристани',
    intro:
      'Рыбаки шепчут о незнакомце у берега. Присмотрись к нему и не упусти ни одной детали в его маршруте.',
    objective: 'Повысь интуицию на 4 единицы.',
    gold: 360,
    experience: 150,
  },
  'tower-whispers': {
    title: 'Эхо башни',
    intro:
      'Смотрители помнят каждый запертый зал. Им нужен тот, кто выдержит холодные коридоры и не отвернётся от теней.',
    objective: 'Повысь силу на 3 единицы.',
    gold: 450,
    experience: 180,
  },
};
const QUEST_HINTS: Record<string, string> = {
  'tavern-first-contract':
    'Иди прямо, направо, налево. Только не забудься в пути и помни: осторожность сегодня важнее скорости.',
  'harbor-lantern':
    'Смотри на отражения в воде, а не на сам огонь. Иногда след виден только сбоку и только с нужного камня.',
  'ash-baron-duel':
    'Выходи к арене без спешки. Барон любит долгий разогрев и теряет ритм, если его встречают хладнокровно.',
};

export function WorldWindowShell({
  title,
  onClose,
  children,
  testId,
  className = '',
  size = 'standard',
  bodyScroll = 'body',
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  testId?: string;
  className?: string;
  size?: WindowSize;
  bodyScroll?: WindowBodyScroll;
}) {
  return (
    <section
      className={`shell-reset-window lov-window-shell size-${size} scroll-${bodyScroll} ${className}`.trim()}
      data-testid={testId}
    >
      <header className="shell-reset-window-header lov-window-header">
        <h2>{title}</h2>
        <button
          className="shell-reset-icon-button lov-window-close"
          aria-label="Закрыть"
          data-testid="world-window-close-button"
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className={`shell-reset-window-body lov-window-body body-scroll-${bodyScroll}`}>{children}</div>
      <footer className="shell-reset-window-footer lov-window-footer">
        <button className="lov-close-button" data-testid="world-window-bottom-close" onClick={onClose}>
          Закрыть
        </button>
      </footer>
    </section>
  );
}

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
                (character?.energy ?? 0) >= quest.energyCost &&
                routeState !== 'traveling' &&
                routeState !== 'ready';
              return (
                <button
                  key={quest.id}
                  type="button"
                  className={`lov-quest-row ${activeQuest?.id === quest.id ? 'active' : ''} ${canTravel ? 'can-travel' : 'locked'}`}
                  data-testid={`task-ribbon-${quest.id}`}
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
  onClose,
  onIntent,
}: {
  enemy: EnemyDefinition | undefined;
  onClose: () => void;
  onIntent: (intent: GameIntent) => void;
}) {
  if (!enemy) {
    return null;
  }

  const stats = [
    { icon: '❤', value: enemy.health },
    { icon: '🛡', value: enemy.armor },
    { icon: 'ATK', value: enemy.stats[STAT_STRENGTH] },
    { icon: 'DEX', value: enemy.stats[STAT_AGILITY] },
    { icon: 'INT', value: enemy.stats[STAT_INTUITION] },
    { icon: 'LCK', value: enemy.stats[STAT_LUCK] },
  ];

  return (
    <WorldWindowShell
      title="Арена"
      onClose={onClose}
      testId="arena-window"
      className="lov-arena-shell"
      size="standard"
      bodyScroll="none"
    >
      <div className="lov-arena-layout">
        <section className="lov-arena-stats">
          <div className="lov-opponent-card">
            <strong>{enemy.nameRu}</strong>
            <span>{enemy.level} уровень</span>
          </div>
          <div className="lov-arena-grid">
            {stats.map((entry) => (
              <div key={`${entry.icon}-${entry.value}`} className="lov-arena-stat">
                <span>{entry.icon}</span>
                <strong>{entry.value}</strong>
              </div>
            ))}
          </div>
        </section>

        <section className="lov-arena-preview">
          <img src={assetPath('enemy-ash-baron')} alt="" />
        </section>
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
          onClick={() => onIntent({ type: 'startArena', enemyId: enemy.id })}
        >
          Начать бой!
        </button>
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
            <span>{state.character?.gold ?? 0}</span>
            <span>{state.character?.gems ?? 0}</span>
          </div>
          <div className="lov-forge-workbench">
            <div className="lov-forge-illustration">
              <img src={assetPath('scene-hub')} alt="" />
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
            {'\u0423\u043b\u0443\u0447\u0448\u0438\u0442\u044c'}
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

export function TravelStage({
  state,
  activeTravel,
  activeTravelReady,
  clock,
  onIntent,
}: {
  state: BootstrapState;
  activeTravel: TravelTask | undefined;
  activeTravelReady: boolean;
  clock: number;
  onIntent: (intent: GameIntent) => void;
}) {
  const activeQuest = activeTravel?.questId ? state.quests.find((quest) => quest.id === activeTravel.questId) : undefined;
  const progress = activeTravel ? buildTravelProgress(activeTravel, clock) : null;

  return (
    <section className="shell-reset-travel-stage lov-travel-stage" data-testid="travel-screen">
      <div className="shell-reset-travel-art">
        <img src={assetPath('scene-map')} alt="" />
      </div>

      <aside className="lov-travel-sidebar">
        <div className="lov-travel-sidecard">
          <span>{progress ? formatDuration(progress.secondsLeft) : '00:41:46'}</span>
        </div>
      </aside>

      <div className="lov-travel-pin">
        <img src={assetPath('hero-nocturne')} alt="" />
      </div>

      <section className="lov-travel-story">
        <div className="lov-travel-portrait">
          <img src={assetPath('hero-nocturne')} alt="" />
        </div>
        <div className="lov-travel-story-copy">
          <p>«Зачем Солнце подарило мне ожерелье? Ведь я не смогла сберечь его. А теперь что? И что будет дальше?»</p>
          {activeTravelReady && activeTravel ? (
            <button type="button" onClick={() => onIntent({ type: 'claimTravel', travelId: activeTravel.id })}>
              Я учту это
            </button>
          ) : (
            <button type="button" disabled>
              Я учту это
            </button>
          )}
        </div>
      </section>

      <div className="lov-travel-bottom">
        <div className="shell-reset-travel-progress lov-travel-progress">
          <span style={{ width: `${progress?.percent ?? 0}%` }} />
        </div>
        <strong>{progress ? formatDuration(progress.secondsLeft) : '00:01:50'}</strong>
        {activeTravelReady && activeTravel ? (
          <button type="button" className="lov-skip-button" onClick={() => onIntent({ type: 'claimTravel', travelId: activeTravel.id })}>
            Завершить путь
          </button>
        ) : null}
        <button type="button" className="lov-skip-button" disabled>
          Не хочу ждать! · 1 жемчужина
        </button>
      </div>

      {activeQuest ? (
        <div className="lov-travel-quest-tag" data-testid="travel-panel">
          <strong>{activeQuest.titleRu}</strong>
          <span>{activeQuest.locationId}</span>
        </div>
      ) : null}
    </section>
  );
}

export function CombatStage({
  state,
  enemy,
  characterHealth,
  characterMaxHealth,
  enemyHealth,
  enemyMaxHealth,
  petHealth,
  petMaxHealth,
  petAssistArmed,
  selectedPetId,
  replayTurns,
  onIntent,
}: {
  state: BootstrapState;
  enemy: EnemyDefinition | undefined;
  characterHealth: number;
  characterMaxHealth: number;
  enemyHealth: number;
  enemyMaxHealth: number;
  petHealth: number;
  petMaxHealth: number;
  petAssistArmed: boolean;
  selectedPetId: string;
  replayTurns: CombatTurn[] | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  const character = state.character;
  if (!character || !enemy) {
    return null;
  }

  const equippedBySlot = getEquippedBySlot(state);
  const heroAssetId = paperDollHeroAssetId(equippedBySlot);
  const selectedPet = PET_VARIANTS.find((pet) => pet.id === selectedPetId) ?? PET_VARIANTS[2]!;
  const recentTurns = replayTurns?.slice(-2) ?? [];
  const latestReplayTurn = replayTurns?.[replayTurns.length - 1];
  const petSummoned = petAssistArmed;
  const petActing = petSummoned && latestReplayTurn?.actor === 'pet';
  const latestTurnLabel = latestReplayTurn ? combatTurnLabel(latestReplayTurn, selectedPet.name, enemy.nameRu, character.name) : null;
  const displayedPetHealth = petMaxHealth > 0 ? petHealth : selectedPet.hp;
  const displayedPetMaxHealth = petMaxHealth > 0 ? petMaxHealth : selectedPet.hp;

  return (
    <section className="shell-reset-combat-stage lov-combat-stage" data-testid="combat-screen">
      <div className="shell-reset-combat-art">
        <img src={assetPath('scene-combat')} alt="" />
      </div>

      <div className="lov-combat-top">
        <div className="lov-combat-header ally">
          <button
            type="button"
            className="lov-combat-info-button"
            data-testid="combat-hero-info-button"
            aria-label="Сведения о герое"
            onClick={() => onIntent({ type: 'openInfo', windowId: 'heroInfo' })}
          >
            <UiIcon name="info" />
          </button>
          <div className="lov-combat-avatar">
            <img src={assetPath(heroAssetId)} alt="" />
          </div>
          <div className="lov-combat-meta">
            <strong>{character.name}</strong>
            <span>{character.level}</span>
            <div className="lov-health-track">
              <i style={{ width: `${Math.round((characterHealth / Math.max(1, characterMaxHealth)) * 100)}%` }} />
            </div>
            <small>{characterHealth}</small>
          </div>
        </div>

        <button
          type="button"
          className="lov-skip-battle"
          data-testid="combat-skip-button"
          onClick={() => onIntent({ type: 'showReward' })}
        >
          Пропустить бой
        </button>

        <div className="lov-combat-header enemy">
          <div className="lov-combat-meta">
            <strong>{enemy.nameRu}</strong>
            <span>{enemy.level}</span>
            <div className="lov-health-track">
              <i style={{ width: `${Math.round((enemyHealth / Math.max(1, enemyMaxHealth)) * 100)}%` }} />
            </div>
            <small>{enemyHealth}</small>
          </div>
          <div className="lov-combat-avatar">
            <img src={assetPath('enemy-ash-baron')} alt="" />
          </div>
          <button
            type="button"
            className="lov-combat-info-button"
            data-testid="combat-enemy-info-button"
            aria-label="Сведения о противнике"
            onClick={() => onIntent({ type: 'openInfo', windowId: 'enemyInfo' })}
          >
            <UiIcon name="info" />
          </button>
        </div>
      </div>

      <div className="lov-battle-stage">
        <img className="lov-fighter hero" src={assetPath(heroAssetId)} alt="" />
        <img className="lov-fighter enemy" src={assetPath('enemy-ash-baron')} alt="" />
        {petSummoned ? (
          <div className={`lov-battle-pet-wrap pet-${selectedPet.id}`}>
            <img
              className={`lov-battle-pet summoned armed ${petActing ? 'assisting' : ''}`}
              data-testid="combat-summoned-pet"
              src={assetPath(selectedPet.assetId)}
              alt=""
              aria-hidden="true"
            />
            <div className="lov-pet-battle-health">
              <span>{selectedPet.name}</span>
              <div className="lov-health-track">
                <i style={{ width: `${Math.round((displayedPetHealth / Math.max(1, displayedPetMaxHealth)) * 100)}%` }} />
              </div>
              <small>{displayedPetHealth}</small>
            </div>
          </div>
        ) : null}
      </div>

      {latestTurnLabel ? (
        <div className={`lov-combat-turn-callout actor-${latestReplayTurn?.actor ?? 'none'}`}>
          <strong>{latestTurnLabel.title}</strong>
          <span>{latestTurnLabel.detail}</span>
        </div>
      ) : null}

      <div className="lov-battle-bottom">
        <div className="lov-pet-card">
          <button
            type="button"
            className={`lov-toggle-chip ${petAssistArmed ? 'active' : ''}`}
            data-testid="pet-assist-button"
            onClick={() => onIntent({ type: 'togglePetAssist' })}
          >
            Вызывать питомца
          </button>
          <div className="lov-pet-card-body">
            <div className="lov-pet-card-image">
              <img src={assetPath(selectedPet.assetId)} alt="" />
            </div>
            <div className="lov-pet-card-copy">
              <strong>{selectedPet.name}</strong>
              <span>{selectedPet.level} уровень</span>
              <div className="lov-health-track">
                <i style={{ width: `${Math.round((displayedPetHealth / Math.max(1, displayedPetMaxHealth)) * 100)}%` }} />
              </div>
              <small>{displayedPetHealth}</small>
            </div>
          </div>
        </div>
      </div>

      {recentTurns.length ? (
        <div className="shell-reset-damage-layer" aria-hidden="true">
          {recentTurns.map((turn: CombatTurn, index: number) => (
            <span
              key={`${turn.turn}-${turn.actor}-${turn.damage}-${index}`}
              className={`shell-reset-damage ${damageTargetClass(turn)} actor-${turn.actor} ${turn.critical ? 'critical' : ''}`}
              style={{ '--float-index': `${index}` } as CSSProperties}
            >
              {turn.actor === 'pet' ? selectedPet.name : turn.actor === 'character' ? character.name : enemy.nameRu}: -{turn.damage}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

function damageTargetClass(turn: CombatTurn) {
  if (turn.target === 'pet') {
    return 'to-pet';
  }
  if (turn.target === 'enemy' || (!turn.target && turn.actor === 'character')) {
    return 'to-enemy';
  }
  return 'to-hero';
}

function combatTurnLabel(turn: CombatTurn, petName: string, enemyName: string, heroName: string) {
  const actor = turn.actor === 'pet' ? petName : turn.actor === 'character' ? heroName : enemyName;
  const target = turn.target === 'pet' ? petName : turn.target === 'enemy' ? enemyName : heroName;
  return {
    title: turn.critical ? 'Критический удар' : 'Удар',
    detail: `${actor} → ${target}: ${turn.damage}`,
  };
}

export function RewardWindow({
  latestResolvedCombat,
  onContinue,
}: {
  latestResolvedCombat: CombatEncounter | undefined;
  onContinue: () => void;
}) {
  const reward = latestResolvedCombat?.log?.reward;
  const didWin =
    latestResolvedCombat?.status === 'won'
    || latestResolvedCombat?.log?.winner === 'character';
  const showRewardValues = didWin && Boolean((reward?.gold ?? 0) > 0 || (reward?.experience ?? 0) > 0);

  return (
    <section className={`lov-victory-window ${didWin ? 'is-victory' : 'is-defeat'}`} data-testid="reward-screen">
      <div className="lov-victory-left">
        <img src={assetPath('hero-nocturne')} alt="" />
      </div>
      <div className="lov-victory-right">
        <h2>Победа!</h2>
        <p>Теперь ты можешь гордиться собой!</p>
        <span>Твоя награда:</span>
        <div className="lov-victory-rewards">
          <strong>{reward?.gold ?? 0} золота</strong>
          <strong>{reward?.experience ?? 0} XP</strong>
        </div>
        <div className="lov-reward-drop" aria-hidden="true" />
        <div className="lov-pet-xp">
          <img src={assetPath('pet-wyvern')} alt="" />
          <strong>1 XP</strong>
        </div>
        <button type="button" data-testid="reward-continue-button" onClick={onContinue}>
          Закрыть
        </button>
      </div>
    </section>
  );
}

export function CombatResultWindow({
  latestResolvedCombat,
  onContinue,
}: {
  latestResolvedCombat: CombatEncounter | undefined;
  onContinue: () => void;
}) {
  const reward = latestResolvedCombat?.log?.reward;
  const didWin =
    latestResolvedCombat?.status === 'won'
    || latestResolvedCombat?.log?.winner === 'character';
  const showRewardValues = didWin && Boolean((reward?.gold ?? 0) > 0 || (reward?.experience ?? 0) > 0);

  return (
    <section className={`lov-victory-window ${didWin ? 'is-victory' : 'is-defeat'}`} data-testid="reward-screen">
      <div className="lov-victory-left">
        <img src={assetPath('hero-nocturne')} alt="" />
      </div>
      <div className="lov-victory-right">
        <h2>{didWin ? '\u041f\u043e\u0431\u0435\u0434\u0430!' : '\u041f\u043e\u0440\u0430\u0436\u0435\u043d\u0438\u0435!'}</h2>
        <p>
          {didWin
            ? '\u0422\u0435\u043f\u0435\u0440\u044c \u0442\u044b \u043c\u043e\u0436\u0435\u0448\u044c \u0433\u043e\u0440\u0434\u0438\u0442\u044c\u0441\u044f \u0441\u043e\u0431\u043e\u0439!'
            : '\u041d\u0430 \u044d\u0442\u043e\u0442 \u0440\u0430\u0437 \u043f\u0440\u043e\u0442\u0438\u0432\u043d\u0438\u043a \u043e\u043a\u0430\u0437\u0430\u043b\u0441\u044f \u0441\u0438\u043b\u044c\u043d\u0435\u0435. \u0421\u043e\u0431\u0435\u0440\u0438 \u0441\u0438\u043b\u044b \u0438 \u043f\u043e\u043f\u0440\u043e\u0431\u0443\u0439 \u0441\u043d\u043e\u0432\u0430.'}
        </p>
        {showRewardValues ? (
          <>
            <span>{'\u0422\u0432\u043e\u044f \u043d\u0430\u0433\u0440\u0430\u0434\u0430:'}</span>
            <div className="lov-victory-rewards">
              <strong>{reward?.gold ?? 0} {'\u0437\u043e\u043b\u043e\u0442\u0430'}</strong>
              <strong>{reward?.experience ?? 0} XP</strong>
            </div>
            <div className="lov-reward-drop" aria-hidden="true" />
            <div className="lov-pet-xp">
              <img src={assetPath('pet-wyvern')} alt="" />
              <strong>1 XP</strong>
            </div>
          </>
        ) : null}
        <button type="button" data-testid="reward-continue-button" onClick={onContinue}>
          {'\u0417\u0430\u043a\u0440\u044b\u0442\u044c'}
        </button>
      </div>
    </section>
  );
}

export function CharacterSheet({
  state,
  activeTab,
  selectedItemStackId,
  selectedPetId,
  onSelectPet,
  onIntent,
}: {
  state: BootstrapState;
  activeTab: SheetTab;
  selectedItemStackId: string | null;
  selectedPetId: string;
  onSelectPet: (petId: string) => void;
  onIntent: (intent: GameIntent) => void;
}) {
  const character = state.character;
  const [hoveredStat, setHoveredStat] = useState<BreakdownKey | null>(null);
  const [statTooltipPosition, setStatTooltipPosition] = useState({ x: 0, y: 0 });
  const [petSatiety, setPetSatiety] = useState(16);
  const [petFood, setPetFood] = useState(16);
  const [inventorySlotOrder, setInventorySlotOrder] = useState<Record<string, number>>({});
  const [appearance, setAppearance] = useState<Record<AppearanceKey, string>>({
    face: APPEARANCE_OPTIONS.face[1]!.id,
    hair: APPEARANCE_OPTIONS.hair[1]!.id,
    color: APPEARANCE_OPTIONS.color[1]!.id,
  });

  if (!character) {
    return null;
  }

  const race = state.races.find((entry) => entry.id === character.raceId);
  const equippedBySlot = getEquippedBySlot(state);
  const equippedEntries = Object.values(equippedBySlot).filter((entry): entry is EquippedEntry => Boolean(entry));
  const backpack = orderBackpackStacks(getBackpackStacks(state), inventorySlotOrder, 24);
  const totals = buildCharacterTotals(state, equippedEntries);
  const breakdowns = buildStatBreakdowns(state, race, equippedEntries);
  const healthBreakdown = buildHealthBreakdown(state, race, equippedEntries);
  const armorBreakdown = buildArmorBreakdown(equippedEntries, totals.armor);
  const selectedPet = PET_VARIANTS.find((entry) => entry.id === selectedPetId) ?? PET_VARIANTS[2]!;
  const profileSummaryStats = buildProfileSummaryStats(character, totals);
  const hoveredBreakdown =
    hoveredStat === 'health'
      ? healthBreakdown
      : hoveredStat === 'armor'
        ? armorBreakdown
        : hoveredStat
          ? breakdowns[hoveredStat]
          : null;
  const updateStatTooltipPosition = (event: { clientX: number; clientY: number }) => {
    setStatTooltipPosition({ x: event.clientX, y: event.clientY });
  };
  const feedPet = (requestedAmount: number) => {
    const satietyRoom = Math.max(0, 99 - petSatiety);
    const amount = Math.min(requestedAmount, petFood, satietyRoom);
    if (amount < 1) {
      return;
    }
    setPetFood((value) => Math.max(0, value - amount));
    setPetSatiety((value) => Math.min(99, value + amount));
  };

  return (
    <section
      className={`shell-reset-sheet lov-sheet tab-${activeTab}`}
      data-testid={
        activeTab === 'pets' ? 'pet-sheet' : activeTab === 'inventory' ? 'inventory-sheet' : activeTab === 'profile' ? 'profile-sheet' : activeTab === 'appearance' ? 'appearance-sheet' : 'character-sheet'
      }
    >
      <button
        type="button"
        className="lov-sheet-close"
        data-testid="sheet-close-button"
        aria-label="Закрыть окно героя"
        onClick={() => onIntent({ type: 'closeSheet' })}
      >
        <UiIcon name="close" />
      </button>
      <aside className="shell-reset-sheet-rail lov-sheet-rail">
        <button type="button" className={activeTab === 'inventory' ? 'active' : ''} data-testid="character-tab-equipment" onClick={() => onIntent({ type: 'setSheetTab', tab: 'inventory' })}>
          Сумка
        </button>
        <button type="button" className={activeTab === 'character' ? 'active' : ''} data-testid="character-tab-stats" onClick={() => onIntent({ type: 'setSheetTab', tab: 'character' })}>
          Характеристики
        </button>
        <button type="button" className={activeTab === 'achievements' ? 'active' : ''} data-testid="character-tab-achievements" onClick={() => onIntent({ type: 'setSheetTab', tab: 'achievements' })}>
          Достижения
        </button>
        <button type="button" className={activeTab === 'pets' ? 'active' : ''} data-testid="character-tab-pets" onClick={() => onIntent({ type: 'setSheetTab', tab: 'pets' })}>
          Питомцы
        </button>
        <button type="button" className={activeTab === 'profile' ? 'active' : ''} data-testid="character-tab-profile" onClick={() => onIntent({ type: 'setSheetTab', tab: 'profile' })}>
          О герое
        </button>
        <button type="button" className={activeTab === 'appearance' ? 'active' : ''} data-testid="character-tab-appearance" onClick={() => onIntent({ type: 'setSheetTab', tab: 'appearance' })}>
          Внешность
        </button>
        <button type="button" className="back" data-testid="sheet-back-button" onClick={() => onIntent({ type: 'closeSheet' })}>
          <UiIcon name="back" />
        </button>
      </aside>

      <section className={`shell-reset-sheet-left lov-sheet-left tab-${activeTab}`}>
        {activeTab === 'character' ? (
          <div className="lov-stats-panel">
            <header className="lov-panel-header">
              <h2>Характеристики</h2>
            </header>

            <div
              className="lov-core-stat"
              onMouseEnter={() => setHoveredStat('health')}
              onMouseMove={updateStatTooltipPosition}
              onMouseLeave={() => setHoveredStat((current) => (current === 'health' ? null : current))}
            >
              <div className="lov-core-stat-icon">❤</div>
              <div className="lov-core-stat-body">
                <strong>Здоровье</strong>
                <span>{character.maxHealth}</span>
              </div>
            </div>

            <div
              className="lov-core-stat"
              onMouseEnter={() => setHoveredStat('armor')}
              onMouseMove={updateStatTooltipPosition}
              onMouseLeave={() => setHoveredStat((current) => (current === 'armor' ? null : current))}
            >
              <div className="lov-core-stat-icon">🛡</div>
              <div className="lov-core-stat-body">
                <strong>Броня</strong>
                <span>{totals.armor}</span>
              </div>
            </div>

            {PRIMARY_STATS.map((stat) => {
              const row = breakdowns[stat];
              const allocationCost = statAllocationGoldCost(character.stats[stat]);
              return (
                <div
                  key={stat}
                  className="lov-stat-group"
                  onMouseEnter={() => setHoveredStat(stat)}
                  onMouseMove={updateStatTooltipPosition}
                  onMouseLeave={() => setHoveredStat((current) => (current === stat ? null : current))}
                >
                  <div className="lov-primary-stat">
                    <div className="lov-primary-stat-main">
                      <span>{statTitle(stat)}</span>
                      <strong>{row.total}</strong>
                    </div>
                    <button
                      type="button"
                      className="lov-stat-add-button"
                      onClick={() => character.gold >= allocationCost && onIntent({ type: 'allocateStat', stat })}
                      disabled={character.gold < allocationCost}
                      aria-label={`Добавить ${statTitle(stat)}`}
                    >
                      <i>+</i>
                      <span className="lov-stat-add-tooltip">{statAllocationCostLabel(allocationCost)}</span>
                    </button>
                  </div>
                  <div className="lov-secondary-stat">{row.derivedLabel}</div>
                  <div className="lov-secondary-stat value">{row.derivedValue}</div>
                  {stat === STAT_STRENGTH ? (
                    <div className="lov-damage-row lov-damage-row-inline">
                      <span>Урон</span>
                      <strong>{buildDamageRange(totals.stats)}</strong>
                    </div>
                  ) : null}
                </div>
              );
            })}

            <div className="lov-currency-row">
              <span className="lov-currency-pill gold">
                <img src={assetPath('icon-gold-coin')} alt="" />
                <i aria-hidden="true">â—‰</i>
                <strong>{character.gold}</strong>
              </span>
              <span className="lov-currency-pill pearls">
                <img src={assetPath('icon-moon-gem')} alt="" />
                <i aria-hidden="true">â—Œ</i>
                <strong>{character.gems}</strong>
              </span>
            </div>

            {hoveredBreakdown ? <StatBreakdownCard breakdown={hoveredBreakdown} position={statTooltipPosition} /> : null}
          </div>
        ) : null}

        {activeTab === 'inventory' ? (
          <div className="lov-bag-screen">
            <header className="lov-panel-header">
              <h2>Рюкзак</h2>
            </header>
            <InventoryGrid
              state={state}
              stacks={backpack}
              selectedStackId={null}
              onSelect={() => onIntent({ type: 'closeInfo' })}
              onDropStack={(inventoryStackId, slotIndex) => {
                setInventorySlotOrder((current) => ({ ...current, [inventoryStackId]: slotIndex }));
                const stack = state.inventory.find((entry) => entry.id === inventoryStackId);
                if (stack?.equippedSlot) {
                  onIntent({ type: 'unequipItem', inventoryStackId });
                }
              }}
              dataTestId="inventory-panel"
              draggable
              fillSlots={24}
            />
          </div>
        ) : null}

        {activeTab === 'pets' ? (
          <div className="lov-pet-screen">
            <header className="lov-panel-header">
              <h2>Питомцы</h2>
            </header>
            <div className="lov-pet-thumb-row">
              {PET_VARIANTS.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  className={`lov-pet-thumb ${selectedPet.id === pet.id ? 'active' : ''}`}
                  onClick={() => onSelectPet(pet.id)}
                >
                  <img src={assetPath(pet.assetId)} alt="" />
                </button>
              ))}
            </div>
            <div className="lov-pet-progress-head">
              <div className="lov-pet-level">{selectedPet.level}</div>
              <div className="lov-pet-name">
                <strong>{selectedPet.name}</strong>
                <Meter label="XP" value={30} max={360} tone="xp" displayValue="30/360" />
              </div>
            </div>
            <div className="lov-pet-preview">
              <img src={assetPath(selectedPet.assetId)} alt="" />
            </div>
            <div className="lov-pet-core-stats">
              <span>❤ {selectedPet.hp}</span>
              <span>🐾 {selectedPet.damage}</span>
            </div>
            <div className="lov-pet-feeding">
              <div className="lov-pet-satiety">
                <strong>Сытость</strong>
                <span>{petSatiety}</span>
              </div>
              <div className="lov-pet-feed-buttons">
                <button type="button" onClick={() => feedPet(1)} disabled={petFood < 1 || petSatiety >= 99}>
                  +1
                </button>
                <button type="button" onClick={() => feedPet(10)} disabled={petFood < 1 || petSatiety >= 99}>
                  +10
                </button>
              </div>
              <div className="lov-pet-food">
                <strong>Еда</strong>
                <span>{petFood}</span>
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'profile' ? (
          <div className="lov-profile-screen">
            <div className="lov-profile-header">
              <img src={assetPath('hero-nocturne')} alt="" />
              <div>
                <strong>{character.name}</strong>
                <span>(LOV)</span>
              </div>
            </div>
            <div className="lov-profile-stats">
              {profileSummaryStats.map((entry) => (
                <div key={entry.label} className="lov-profile-stat">
                  <span>{entry.label}</span>
                  <strong>{entry.value}</strong>
                </div>
              ))}
            </div>
            <div className="lov-quick-slots">
              {[assetPath('icon-onyx'), '', '', ''].map((src, index) => (
                <span key={`${src}-${index}`} className={`lov-quick-slot ${src ? 'filled' : ''}`}>
                  {src ? <img src={src} alt="" /> : null}
                </span>
              ))}
            </div>
            <div className="lov-motto-box">
              <span>Нет девиза</span>
              <button type="button" aria-label="Изменить девиз" disabled>
                ✎
              </button>
            </div>
            <div className="lov-reward-gallery">
              <strong>Награды и подарки</strong>
              <div className="lov-reward-gallery-grid">
                {PROFILE_REWARDS.map((reward) => (
                  <span key={reward.id} className={`lov-profile-reward ${reward.accent}`}>
                    {reward.label === 'Пусто' ? '' : reward.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'appearance' ? (
          <div className="lov-appearance-screen">
            <header className="lov-panel-header">
              <h2>Внешность</h2>
            </header>
            {(['face', 'hair', 'color'] as AppearanceKey[]).map((group) => (
              <AppearanceSelector
                key={group}
                title={appearanceTitle(group)}
                options={APPEARANCE_OPTIONS[group]}
                activeId={appearance[group]}
                onSelect={(value) => setAppearance((current) => ({ ...current, [group]: value }))}
              />
            ))}
            <button type="button" className="lov-danger-button" disabled>
              Начать заново · 9 жемчужин
            </button>
          </div>
        ) : null}

        {activeTab === 'achievements' ? (
          <div className="lov-achievement-screen">
            <header className="lov-panel-header">
              <h2>Достижения</h2>
            </header>
            <div className="lov-achievement-grid">
              {PROFILE_REWARDS.map((reward) => (
                <article key={reward.id} className="lov-journal-card">
                  <h3>{reward.label === 'Пусто' ? 'Свободный слот' : reward.label}</h3>
                  <p>
                    {reward.label === 'Пусто'
                      ? 'Новый знак появится здесь после следующего крупного события.'
                      : 'Памятный знак уже занял своё место в коллекции героя.'}
                  </p>
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <section className={`shell-reset-sheet-right lov-sheet-right tab-${activeTab}`}>
        <PaperDollPanel
          state={state}
          character={character}
          activeTab={activeTab}
          equippedBySlot={equippedBySlot}
          selectedPetAssetId={selectedPet.assetId}
          onIntent={onIntent}
        />
      </section>
    </section>
  );
}

export function HeroInfoPanel({
  state,
}: {
  state: BootstrapState;
}) {
  const character = state.character;
  if (!character) {
    return null;
  }

  const race = state.races.find((entry) => entry.id === character.raceId);
  const equippedEntries = Object.values(getEquippedBySlot(state)).filter((entry): entry is EquippedEntry => Boolean(entry));
  const totals = buildCharacterTotals(state, equippedEntries);

  return (
    <div className="shell-reset-info-card lov-overlay-card" data-testid="character-info-popup">
      <h3>{character.name}</h3>
      <p>{race?.nameRu ?? character.raceId}</p>
      <div className="lov-profile-stats compact">
        <div className="lov-profile-stat"><span>❤</span><strong>{character.maxHealth}</strong></div>
        <div className="lov-profile-stat"><span>🛡</span><strong>{totals.armor}</strong></div>
        <div className="lov-profile-stat"><span>ATK</span><strong>{totals.stats[STAT_STRENGTH]}</strong></div>
        <div className="lov-profile-stat"><span>DEX</span><strong>{totals.stats[STAT_AGILITY]}</strong></div>
        <div className="lov-profile-stat"><span>INT</span><strong>{totals.stats[STAT_INTUITION]}</strong></div>
        <div className="lov-profile-stat"><span>LCK</span><strong>{totals.stats[STAT_LUCK]}</strong></div>
      </div>
    </div>
  );
}

export function HeroInfoWindow({
  state,
  onClose,
  onIntent,
}: {
  state: BootstrapState;
  onClose: () => void;
  onIntent: (intent: GameIntent) => void;
}) {
  const character = state.character;
  if (!character) {
    return null;
  }

  const race = state.races.find((entry) => entry.id === character.raceId);
  const equippedBySlot = getEquippedBySlot(state);
  const equippedEntries = Object.values(equippedBySlot).filter((entry): entry is EquippedEntry => Boolean(entry));
  const totals = buildCharacterTotals(state, equippedEntries);
  const profileSummaryStats = buildProfileSummaryStats(character, totals);

  return (
    <WorldWindowShell
      title={'\u0421\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u043e \u0433\u0435\u0440\u043e\u0435'}
      onClose={onClose}
      testId="character-info-popup"
      className="lov-hero-info-shell"
      size="hero"
      bodyScroll="none"
    >
      <div className="lov-hero-info-layout">
        <section className="lov-sheet-left lov-hero-info-main">
          <div className="lov-profile-screen lov-profile-screen-window">
            <div className="lov-profile-header">
              <img src={assetPath('hero-nocturne')} alt="" />
              <div>
                <strong>{character.name}</strong>
                <span>{race?.nameRu ?? character.raceId}</span>
              </div>
            </div>
            <div className="lov-profile-stats">
              {profileSummaryStats.map((entry) => (
                <div key={entry.label} className="lov-profile-stat">
                  <span>{entry.label}</span>
                  <strong>{entry.value}</strong>
                </div>
              ))}
            </div>
            <div className="lov-quick-slots">
              {[assetPath('icon-onyx'), '', '', ''].map((src, index) => (
                <span key={`${src}-${index}`} className={`lov-quick-slot ${src ? 'filled' : ''}`}>
                  {src ? <img src={src} alt="" /> : null}
                </span>
              ))}
            </div>
            <div className="lov-motto-box">
              <span>{'\u041d\u0435\u0442 \u0434\u0435\u0432\u0438\u0437\u0430'}</span>
              <button
                type="button"
                aria-label={'\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u0434\u0435\u0432\u0438\u0437'}
                disabled
              >
                ✎
              </button>
            </div>
            <div className="lov-reward-gallery">
              <strong>{'\u041d\u0430\u0433\u0440\u0430\u0434\u044b \u0438 \u043f\u043e\u0434\u0430\u0440\u043a\u0438'}</strong>
              <div className="lov-reward-gallery-grid">
                {PROFILE_REWARDS.map((reward) => (
                  <span key={reward.id} className={`lov-profile-reward ${reward.accent}`}>
                    {reward.accent === 'empty' ? '' : reward.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="lov-sheet-right lov-hero-info-side">
          <PaperDollPanel
            state={state}
            character={character}
            activeTab="profile"
            equippedBySlot={equippedBySlot}
            onIntent={onIntent}
          />
        </section>
      </div>
    </WorldWindowShell>
  );
}

export function EnemyInfoPanel({
  enemy,
}: {
  enemy: EnemyDefinition | undefined;
}) {
  if (!enemy) {
    return <div className="shell-reset-info-card lov-overlay-card">Противник пока не выбран.</div>;
  }

  return (
    <div className="shell-reset-info-card lov-overlay-card" data-testid="enemy-info-popup">
      <h3>{enemy.nameRu}</h3>
      <div className="lov-profile-stats compact">
        <div className="lov-profile-stat"><span>❤</span><strong>{enemy.health}</strong></div>
        <div className="lov-profile-stat"><span>🛡</span><strong>{enemy.armor}</strong></div>
        <div className="lov-profile-stat"><span>ATK</span><strong>{enemy.stats[STAT_STRENGTH]}</strong></div>
        <div className="lov-profile-stat"><span>DEX</span><strong>{enemy.stats[STAT_AGILITY]}</strong></div>
        <div className="lov-profile-stat"><span>INT</span><strong>{enemy.stats[STAT_INTUITION]}</strong></div>
        <div className="lov-profile-stat"><span>LCK</span><strong>{enemy.stats[STAT_LUCK]}</strong></div>
      </div>
    </div>
  );
}

export function EnemyInfoWindow({
  enemy,
  onClose,
}: {
  enemy: EnemyDefinition | undefined;
  onClose: () => void;
}) {
  if (!enemy) {
    return null;
  }

  return (
    <WorldWindowShell
      title={'\u0421\u0432\u0435\u0434\u0435\u043d\u0438\u044f \u043e \u043f\u0440\u043e\u0442\u0438\u0432\u043d\u0438\u043a\u0435'}
      onClose={onClose}
      testId="enemy-info-popup"
      className="lov-hero-info-shell lov-enemy-info-shell"
      size="hero"
      bodyScroll="none"
    >
      <div className="lov-hero-info-layout lov-enemy-info-layout">
        <section className="lov-sheet-left lov-hero-info-main">
          <div className="lov-profile-screen lov-profile-screen-window">
            <div className="lov-profile-header">
              <img src={assetPath('enemy-ash-baron')} alt="" />
              <div>
                <strong>{enemy.nameRu}</strong>
                <span>{enemy.boss ? '\u0411\u043e\u0441\u0441' : '\u041f\u0440\u043e\u0442\u0438\u0432\u043d\u0438\u043a'}</span>
              </div>
            </div>
            <div className="lov-profile-stats">
              <div className="lov-profile-stat"><span>HP</span><strong>{enemy.health}</strong></div>
              <div className="lov-profile-stat"><span>Броня</span><strong>{enemy.armor}</strong></div>
              <div className="lov-profile-stat"><span>Сила</span><strong>{enemy.stats[STAT_STRENGTH]}</strong></div>
              <div className="lov-profile-stat"><span>Ловкость</span><strong>{enemy.stats[STAT_AGILITY]}</strong></div>
              <div className="lov-profile-stat"><span>Интуиция</span><strong>{enemy.stats[STAT_INTUITION]}</strong></div>
              <div className="lov-profile-stat"><span>Удача</span><strong>{enemy.stats[STAT_LUCK]}</strong></div>
            </div>
          </div>
        </section>

        <section className="lov-sheet-right lov-hero-info-side">
          <div className="lov-enemy-info-portrait">
            <img src={assetPath('enemy-ash-baron')} alt="" />
          </div>
        </section>
      </div>
    </WorldWindowShell>
  );
}

export function ItemInfoPanel({
  stack,
  item,
  onIntent,
}: {
  stack: InventoryStack | undefined;
  item: ItemDefinition | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  if (!stack || !item) {
    return <div className="shell-reset-info-card lov-overlay-card">Предмет не найден.</div>;
  }

  const statTags = getItemStatTags(item, stack.enhancementLevel ?? 0);

  return (
    <div className="shell-reset-info-card lov-overlay-card" data-testid="item-info-popup">
      <h3>{item.nameRu}</h3>
      <p>{item.descriptionRu}</p>
      <div className="lov-item-stat-tags">
        {statTags.map((tag) => (
          <span key={tag}>{tag}</span>
        ))}
      </div>
      <small>{formatPrice(item)}</small>
      <small>Улучшение: +{stack.enhancementLevel ?? 0}</small>
      {item.slot ? (
        <div className="lov-overlay-actions">
          {stack.equippedSlot ? (
            <button type="button" onClick={() => onIntent({ type: 'unequipItem', inventoryStackId: stack.id })}>
              Снять
            </button>
          ) : (
            <button type="button" onClick={() => onIntent({ type: 'equipItem', inventoryStackId: stack.id })}>
              Экипировать
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export function PetInfoPanel() {
  return (
    <div className="shell-reset-info-card lov-overlay-card" data-testid="pet-info-popup">
      <h3>Питомец</h3>
      <p>Спутник усиливает героя, растёт рядом с ним и получает собственную полосу прогресса.</p>
      <div className="lov-profile-stats compact">
        <div className="lov-profile-stat"><span>❤</span><strong>2100</strong></div>
        <div className="lov-profile-stat"><span>🐾</span><strong>40-41</strong></div>
        <div className="lov-profile-stat"><span>🍲</span><strong>16</strong></div>
      </div>
    </div>
  );
}

function PaperDollPanel({
  state,
  character,
  activeTab,
  equippedBySlot,
  selectedPetAssetId,
  onIntent,
}: {
  state: BootstrapState;
  character: NonNullable<BootstrapState['character']>;
  activeTab: SheetTab;
  equippedBySlot: Partial<Record<EquipmentSlot, EquippedEntry>>;
  selectedPetAssetId?: string | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  const heroAssetId = paperDollHeroAssetId(equippedBySlot);
  const paperDollPetAssetId = selectedPetAssetId ?? 'pet-wyvern';

  return (
    <div className={`lov-paperdoll ${activeTab === 'profile' ? 'profile' : ''}`}>
      <div className="lov-paperdoll-header">
        <strong>{character.name}</strong>
        <span>{character.level} уровень</span>
      </div>

      <div className="lov-paperdoll-stage">
        <div className="lov-paperdoll-column left">
          {LEFT_SLOTS.map((slot) => (
            <EquipmentSlotButton
              key={slot}
              slot={slot}
              entry={equippedBySlot[slot]}
              onIntent={onIntent}
            />
          ))}
          <span className="shell-reset-slot lov-paperdoll-slot empty reserve" aria-hidden="true" />
        </div>

        <div className="lov-paperdoll-center">
          <img className="lov-paperdoll-hero" src={assetPath(heroAssetId)} alt="" />
          {equippedBySlot.pet || selectedPetAssetId ? <img className="lov-paperdoll-pet" src={assetPath(paperDollPetAssetId)} alt="" /> : null}
          <span className="lov-wing-badge">🪽</span>
        </div>

        <div className="lov-paperdoll-column right">
          {RIGHT_SLOTS.map((slot) => (
            <EquipmentSlotButton
              key={slot}
              slot={slot}
              entry={equippedBySlot[slot]}
              onIntent={onIntent}
            />
          ))}
          <span className="shell-reset-slot lov-paperdoll-slot empty reserve" aria-hidden="true" />
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div className="lov-prestige-bar">Уровень величия: 12</div>
      ) : (
        <div className="lov-paperdoll-quickbar">
          {['', '', '', assetPath('icon-onyx'), '', '', ''].map((src, index) => (
            <span key={`${src}-${index}`} className={`lov-quick-slot ${src ? 'filled' : ''}`}>
              {src ? <img src={src} alt="" /> : null}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function paperDollHeroAssetId(equippedBySlot: Partial<Record<EquipmentSlot, EquippedEntry>>): string {
  const hasArmor = Boolean(equippedBySlot.armor);
  const hasWeapon = Boolean(equippedBySlot.weapon);

  if (!hasArmor && hasWeapon) {
    return 'hero-nocturne-without-armor-with-sword';
  }

  if (!hasArmor) {
    return 'hero-nocturne-without-armor';
  }

  if (!hasWeapon) {
    return 'hero-nocturne-without-sword';
  }

  return 'hero-nocturne';
}

function AppearanceSelector({
  title,
  options,
  activeId,
  onSelect,
}: {
  title: string;
  options: AppearanceOption[];
  activeId: string;
  onSelect: (value: string) => void;
}) {
  const activeIndex = Math.max(0, options.findIndex((option) => option.id === activeId));
  const prev = options[(activeIndex - 1 + options.length) % options.length]!;
  const current = options[activeIndex]!;
  const next = options[(activeIndex + 1) % options.length]!;

  return (
    <section className="lov-appearance-group">
      <h3>{title}</h3>
      <div className="lov-appearance-carousel">
        <button type="button" aria-label={`Предыдущий вариант ${title}`} onClick={() => onSelect(prev.id)}>
          ‹
        </button>
        {[prev, current, next].map((option, index) => (
          <span
            key={option.id}
            className={`lov-appearance-card ${index === 1 ? 'active' : ''}`}
            style={option.swatch ? ({ '--swatch': option.swatch } as CSSProperties) : undefined}
          >
            {option.imageAssetId ? <img src={assetPath(option.imageAssetId)} alt="" /> : null}
            {option.swatch ? <i /> : null}
          </span>
        ))}
        <button type="button" aria-label={`Следующий вариант ${title}`} onClick={() => onSelect(next.id)}>
          ›
        </button>
      </div>
    </section>
  );
}

function StatBreakdownCard({
  breakdown,
  position,
}: {
  breakdown: StatBreakdown;
  position: { x: number; y: number };
}) {
  const details = breakdown.details ?? [
    { label: 'Базовое значение', value: `${breakdown.base ?? 0}` },
    { label: 'Вручную добавлено', value: `+${breakdown.manual ?? 0}` },
    { label: 'Надетое снаряжение', value: `+${breakdown.equipment ?? 0}` },
    { label: 'Эффект от зелья', value: '+0' },
    { label: 'Эффект от достижений', value: '+0' },
    { label: 'Бонус клана', value: '+0' },
    { label: 'Итог', value: `${breakdown.total}`, tone: 'total' as const },
  ];
  const visibleDetails = details.filter((line) => line.tone === 'total' || !isZeroBreakdownValue(line.value));

  return (
    <div
      className="lov-stat-breakdown"
      data-testid={`stat-breakdown-${breakdown.key}`}
      style={{ '--stat-tooltip-x': `${position.x}px`, '--stat-tooltip-y': `${position.y}px` } as CSSProperties}
    >
      <h3>{breakdown.title}</h3>
      {visibleDetails.map((line) => (
        <div key={line.label} className={`lov-breakdown-line ${line.tone === 'total' ? 'total' : ''}`}>
          <span>{line.label}</span>
          <strong>{line.value}</strong>
        </div>
      ))}
    </div>
  );
}

function isZeroBreakdownValue(value: string) {
  return value.trim() === '0' || value.trim() === '+0';
}

function statAllocationCostLabel(goldCost: number) {
  return `${goldCost} золота`;
}

function InventoryGrid({
  state,
  stacks,
  selectedStackId,
  onSelect,
  onDropStack,
  dataTestId,
  draggable = false,
  fillSlots = 18,
}: {
  state: BootstrapState;
  stacks: Array<InventoryStack | null>;
  selectedStackId: string | null;
  onSelect: (inventoryStackId: string) => void;
  onDropStack?: (inventoryStackId: string, slotIndex: number) => void;
  dataTestId?: string;
  draggable?: boolean;
  fillSlots?: number;
}) {
  const cells: Array<InventoryStack | null> = [...stacks];
  while (cells.length < fillSlots) {
    cells.push(null);
  }

  return (
    <div
      className="shell-reset-grid lov-inventory-grid"
      data-testid={dataTestId}
      onDragOver={(event) => onDropStack && event.preventDefault()}
      onDrop={(event) => {
        if (!onDropStack) {
          return;
        }
        event.preventDefault();
        const inventoryStackId = readDraggedStackId(event);
        if (inventoryStackId) {
          onDropStack(inventoryStackId, 0);
        }
      }}
    >
      {cells.map((stack, index) => {
        if (!stack) {
          return (
            <span
              key={`empty-${index}`}
              className="lov-grid-empty"
              onDragOver={(event) => onDropStack && event.preventDefault()}
              onDrop={(event) => {
                if (!onDropStack) {
                  return;
                }
                event.preventDefault();
                event.stopPropagation();
                const inventoryStackId = readDraggedStackId(event);
                if (inventoryStackId) {
                  onDropStack(inventoryStackId, index);
                }
              }}
            />
          );
        }
        const item = state.items.find((entry) => entry.id === stack.itemId);
        return (
          <button
            key={stack.id}
            type="button"
            draggable={draggable}
            className={`shell-reset-grid-item lov-grid-item ${selectedStackId === stack.id ? 'active' : ''}`}
            onClick={() => onSelect(stack.id)}
            onPointerMove={setItemHoverPosition}
            onFocus={setItemHoverPositionFromFocus}
            onDragStart={(event) => {
              if (!draggable) {
                return;
              }
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData(DRAG_STACK_TYPE, stack.id);
            }}
            onDragOver={(event) => onDropStack && event.preventDefault()}
            onDrop={(event) => {
              if (!onDropStack) {
                return;
              }
              event.preventDefault();
              event.stopPropagation();
              const inventoryStackId = readDraggedStackId(event);
              if (inventoryStackId) {
                onDropStack(inventoryStackId, index);
              }
            }}
          >
            <ItemChip item={item} compact />
            <small>x{stack.quantity}</small>
            {item ? <ItemHoverCard stack={stack} item={item} /> : null}
          </button>
        );
      })}
    </div>
  );
}

function EquipmentSlotButton({
  slot,
  entry,
  onIntent,
}: {
  slot: EquipmentSlot;
  entry: EquippedEntry | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <button
      type="button"
      draggable={Boolean(entry)}
      className={`shell-reset-slot lov-paperdoll-slot ${entry ? 'filled' : 'empty'}`}
      data-slot={slot}
      aria-label={entry ? `${entry.item.nameRu}` : SLOT_LABELS[slot]}
      onPointerMove={setItemHoverPosition}
      onFocus={setItemHoverPositionFromFocus}
      onDragStart={(event) => {
        if (!entry) {
          return;
        }
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData(DRAG_STACK_TYPE, entry.stack.id);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const inventoryStackId = readDraggedStackId(event);
        if (inventoryStackId) {
          onIntent({ type: 'equipItem', inventoryStackId });
        }
      }}
    >
      {entry ? (
        <>
          <ItemChip item={entry.item} compact />
          <ItemHoverCard stack={entry.stack} item={entry.item} />
        </>
      ) : (
        <span className="lov-slot-silhouette" aria-hidden="true">
          {SLOT_HINTS[slot]}
        </span>
      )}
    </button>
  );
}

function ItemHoverCard({
  stack,
  item,
}: {
  stack: InventoryStack;
  item: ItemDefinition;
}) {
  const statTags = getItemStatTags(item, stack.enhancementLevel ?? 0);

  return (
    <span className="lov-item-hover-card" role="tooltip">
      <strong>{item.nameRu}</strong>
      <span>{item.descriptionRu}</span>
      <span className="lov-item-hover-tags">
        {statTags.map((tag) => (
          <i key={tag}>{tag}</i>
        ))}
      </span>
      <small>{formatPrice(item)}</small>
      <small>{`Улучшение: +${stack.enhancementLevel ?? 0}`}</small>
    </span>
  );
}

function setItemHoverPosition(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--item-tooltip-x', `${event.clientX}px`);
  event.currentTarget.style.setProperty('--item-tooltip-y', `${event.clientY}px`);
}

function setItemHoverPositionFromFocus(event: FocusEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--item-tooltip-x', `${rect.right}px`);
  event.currentTarget.style.setProperty('--item-tooltip-y', `${rect.top + rect.height / 2}px`);
}

function buildCharacterTotals(state: BootstrapState, equippedEntries: EquippedEntry[]) {
  const character = state.character!;
  const enhancedItems = equippedEntries.map((entry) => ({
    definition: entry.item,
    enhancementLevel: entry.stack.enhancementLevel ?? 0,
  }));

  return {
    stats: statsWithEquipment(character.stats, enhancedItems),
    armor: armorFromEquipment(enhancedItems),
  };
}

function buildProfileSummaryStats(
  character: NonNullable<BootstrapState['character']>,
  totals: ReturnType<typeof buildCharacterTotals>,
) {
  return [
    { label: '\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435', value: character.maxHealth },
    { label: '\u0411\u0440\u043e\u043d\u044f', value: totals.armor },
    { label: '\u0421\u0438\u043b\u0430', value: totals.stats[STAT_STRENGTH] },
    { label: '\u041b\u043e\u0432\u043a\u043e\u0441\u0442\u044c', value: totals.stats[STAT_AGILITY] },
    { label: '\u0418\u043d\u0442\u0443\u0438\u0446\u0438\u044f', value: totals.stats[STAT_INTUITION] },
    { label: '\u0423\u0434\u0430\u0447\u0430', value: totals.stats[STAT_LUCK] },
  ];
}

function buildHealthBreakdown(
  state: BootstrapState,
  race: Race | undefined,
  equippedEntries: EquippedEntry[],
): StatBreakdown {
  const character = state.character!;
  const classStrength = CLASS_BONUSES[character.classId]?.[STAT_STRENGTH] ?? 0;
  const raceStrength = race?.baseStats[STAT_STRENGTH] ?? 0;
  const manualStrength = Math.max(0, character.stats[STAT_STRENGTH] - raceStrength - classStrength);
  const equipmentStrength = equippedEntries.reduce(
    (total, entry) => total + (itemStatsWithEnhancement(entry.item, entry.stack.enhancementLevel ?? 0)[STAT_STRENGTH] ?? 0),
    0,
  );
  const baseHealth = maxHealthForStats(
    {
      '\u0441\u0438\u043b\u0430': raceStrength + classStrength,
      '\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c': 0,
      '\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f': 0,
      '\u0443\u0434\u0430\u0447\u0430': 0,
    } as CharacterStats,
    character.level,
    character.rebirths,
  );
  const investedHealth = manualStrength * 6;
  const equipmentHealth = equipmentStrength * 6;
  const remainder = character.maxHealth - baseHealth - investedHealth - equipmentHealth;
  const adjustedBase = Math.max(0, baseHealth + Math.min(0, remainder));
  const wingHealth = Math.max(0, remainder);

  return {
    key: 'health',
    title: 'Здоровье',
    total: character.maxHealth,
    details: [
      { label: 'Базовое значение', value: `${adjustedBase}` },
      { label: 'Вложено в силу', value: `+${investedHealth}` },
      { label: 'Надетое снаряжение', value: `+${equipmentHealth}` },
      { label: 'Эффект от зелья', value: '+0' },
      { label: 'Эффект от подарков', value: '+0' },
      { label: 'Эффект от крыльев', value: `+${wingHealth}` },
      { label: 'Итог', value: `${character.maxHealth}`, tone: 'total' },
    ],
  };
}

function buildArmorBreakdown(
  equippedEntries: EquippedEntry[],
  totalArmor: number,
): StatBreakdown {
  const armorPieces = equippedEntries
    .filter((entry) => (entry.item.armorBonus ?? 0) > 0)
    .map((entry) => ({
      slot: entry.stack.equippedSlot,
      value: itemArmorWithEnhancement(entry.item, entry.stack.enhancementLevel ?? 0),
    }))
    .filter((entry) => entry.slot && entry.value > 0);

  const details: StatBreakdownLine[] = [
    { label: 'Базовое значение', value: '0' },
    { label: 'Надетое снаряжение', value: `+${totalArmor}` },
    { label: 'Эффект от зелья', value: '+0' },
  ];

  for (const piece of armorPieces) {
    details.push({
      label: `${slotTitle(piece.slot!)}:`,
      value: `+${piece.value}`,
    });
  }

  details.push({ label: 'Итог', value: `${totalArmor}`, tone: 'total' });

  return {
    key: 'armor',
    title: 'Броня',
    total: totalArmor,
    details,
  };
}

function buildStatBreakdowns(
  state: BootstrapState,
  race: Race | undefined,
  equippedEntries: EquippedEntry[],
): Record<StatKey, StatBreakdown> {
  const character = state.character!;
  const equipmentByStat = PRIMARY_STATS.reduce(
    (accumulator, stat) => ({
      ...accumulator,
      [stat]: equippedEntries.reduce(
        (total, entry) =>
          total + (itemStatsWithEnhancement(entry.item, entry.stack.enhancementLevel ?? 0)[stat] ?? 0),
        0,
      ),
    }),
    {} as Record<StatKey, number>,
  );
  const totals = buildCharacterTotals(state, equippedEntries);

  const breakdowns = {
    [STAT_STRENGTH]: {
      key: STAT_STRENGTH,
      title: 'Сила',
      base: (race?.baseStats[STAT_STRENGTH] ?? 0) + (CLASS_BONUSES[character.classId]?.[STAT_STRENGTH] ?? 0),
      manual: Math.max(
        0,
        character.stats[STAT_STRENGTH] - (race?.baseStats[STAT_STRENGTH] ?? 0) - (CLASS_BONUSES[character.classId]?.[STAT_STRENGTH] ?? 0),
      ),
      equipment: equipmentByStat[STAT_STRENGTH],
      total: totals.stats[STAT_STRENGTH],
      derivedLabel: 'Защита от мечей',
      derivedValue: `${Math.round(totals.stats[STAT_STRENGTH] * 0.5 + totals.armor * 0.35)}`,
    },
    [STAT_AGILITY]: {
      key: STAT_AGILITY,
      title: 'Ловкость',
      base: (race?.baseStats[STAT_AGILITY] ?? 0) + (CLASS_BONUSES[character.classId]?.[STAT_AGILITY] ?? 0),
      manual: Math.max(
        0,
        character.stats[STAT_AGILITY] - (race?.baseStats[STAT_AGILITY] ?? 0) - (CLASS_BONUSES[character.classId]?.[STAT_AGILITY] ?? 0),
      ),
      equipment: equipmentByStat[STAT_AGILITY],
      total: totals.stats[STAT_AGILITY],
      derivedLabel: 'Защита от стрел',
      derivedValue: `${Math.round(totals.stats[STAT_AGILITY] * 0.5 + totals.armor * 0.2)}`,
    },
    [STAT_INTUITION]: {
      key: STAT_INTUITION,
      title: 'Интуиция',
      base: (race?.baseStats[STAT_INTUITION] ?? 0) + (CLASS_BONUSES[character.classId]?.[STAT_INTUITION] ?? 0),
      manual: Math.max(
        0,
        character.stats[STAT_INTUITION] -
          (race?.baseStats[STAT_INTUITION] ?? 0) -
          (CLASS_BONUSES[character.classId]?.[STAT_INTUITION] ?? 0),
      ),
      equipment: equipmentByStat[STAT_INTUITION],
      total: totals.stats[STAT_INTUITION],
      derivedLabel: 'Защита от магии',
      derivedValue: `${Math.round(totals.stats[STAT_INTUITION] * 0.5 + totals.armor * 0.12)}`,
    },
    [STAT_LUCK]: {
      key: STAT_LUCK,
      title: 'Удача',
      base: (race?.baseStats[STAT_LUCK] ?? 0) + (CLASS_BONUSES[character.classId]?.[STAT_LUCK] ?? 0),
      manual: Math.max(
        0,
        character.stats[STAT_LUCK] - (race?.baseStats[STAT_LUCK] ?? 0) - (CLASS_BONUSES[character.classId]?.[STAT_LUCK] ?? 0),
      ),
      equipment: equipmentByStat[STAT_LUCK],
      total: totals.stats[STAT_LUCK],
      derivedLabel: 'Шанс двойного урона',
      derivedValue: `${Math.min(95, Math.round(totals.stats[STAT_LUCK] * 1.4 + character.level))}%`,
    },
  } as Record<StatKey, StatBreakdown>;

  return breakdowns;
}

function buildDamageRange(stats: CharacterStats) {
  const min = Math.max(1, Math.round(stats[STAT_STRENGTH] * 2.2));
  const max = Math.max(min + 1, Math.round(stats[STAT_STRENGTH] * 3.2));
  return `${min}-${max}`;
}

function getBackpackStacks(state: BootstrapState) {
  return state.inventory.filter((stack) => !stack.equippedSlot);
}

function orderBackpackStacks(stacks: InventoryStack[], slotOrder: Record<string, number>, fillSlots: number) {
  const cells: Array<InventoryStack | null> = Array.from({ length: fillSlots }, () => null);
  const unordered: InventoryStack[] = [];

  for (const stack of stacks) {
    const preferredIndex = slotOrder[stack.id];
    if (preferredIndex === undefined) {
      unordered.push(stack);
      continue;
    }

    const startIndex = Math.min(Math.max(0, preferredIndex), fillSlots - 1);
    const availableIndex = findNextOpenInventoryCell(cells, startIndex);
    if (availableIndex === -1) {
      unordered.push(stack);
      continue;
    }
    cells[availableIndex] = stack;
  }

  for (const stack of unordered) {
    const availableIndex = findNextOpenInventoryCell(cells, 0);
    if (availableIndex === -1) {
      cells.push(stack);
    } else {
      cells[availableIndex] = stack;
    }
  }

  return cells;
}

function findNextOpenInventoryCell(cells: Array<InventoryStack | null>, startIndex: number) {
  for (let index = startIndex; index < cells.length; index += 1) {
    if (!cells[index]) {
      return index;
    }
  }
  for (let index = 0; index < startIndex; index += 1) {
    if (!cells[index]) {
      return index;
    }
  }
  return -1;
}

function getEquippedBySlot(state: BootstrapState) {
  return state.inventory.reduce((accumulator, stack) => {
    if (!stack.equippedSlot) {
      return accumulator;
    }
    const item = state.items.find((entry) => entry.id === stack.itemId);
    if (!item) {
      return accumulator;
    }
    accumulator[stack.equippedSlot] = { stack, item };
    return accumulator;
  }, {} as Partial<Record<EquipmentSlot, EquippedEntry>>);
}

function getItemStatTags(item: ItemDefinition, enhancementLevel = 0) {
  const stats = itemStatsWithEnhancement(item, enhancementLevel);
  const tags = Object.entries(stats)
    .filter(([, value]) => (value ?? 0) > 0)
    .map(([key, value]) => `${statTitle(key as StatKey)} +${value}`);

  if (item.armorBonus) {
    tags.push(`Броня +${item.armorBonus + enhancementLevel * 2}`);
  }

  return tags.length ? tags : ['Без бонусов к характеристикам'];
}

function formatPrice(item: ItemDefinition) {
  return item.priceGems && item.priceGems > 0 ? `${item.priceGems} жемчужин` : `${item.priceGold} золота`;
}

function readDraggedStackId(event: { dataTransfer: DataTransfer }) {
  const inventoryStackId = event.dataTransfer.getData(DRAG_STACK_TYPE);
  return inventoryStackId || null;
}

function readDraggedStoreItemId(event: { dataTransfer: DataTransfer }) {
  const itemId = event.dataTransfer.getData(DRAG_STORE_ITEM_TYPE);
  return itemId || null;
}

function buildTravelProgress(travel: TravelTask, now: number) {
  const started = new Date(travel.startedAt).getTime();
  const completes = new Date(travel.completesAt).getTime();
  const total = Math.max(1, completes - started);
  const elapsed = Math.min(total, Math.max(0, now - started));
  const secondsLeft = Math.max(0, Math.ceil((completes - now) / 1000));

  return {
    percent: Math.min(100, Math.round((elapsed / total) * 100)),
    secondsLeft,
  };
}

function formatDuration(seconds: number) {
  const total = Math.max(0, seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return [hours, minutes, remainder].map((part) => `${part}`.padStart(2, '0')).join(':');
}

function statTitle(stat: StatKey) {
  switch (stat) {
    case STAT_STRENGTH:
      return 'Сила';
    case STAT_AGILITY:
      return 'Ловкость';
    case STAT_INTUITION:
      return 'Интуиция';
    case STAT_LUCK:
      return 'Удача';
    default:
      return stat;
  }
}

function slotTitle(slot: EquipmentSlot) {
  switch (slot) {
    case 'weapon':
      return 'Оружие';
    case 'helmet':
      return 'Шлем';
    case 'armor':
      return 'Доспех';
    case 'gloves':
      return 'Перчатки';
    case 'boots':
      return 'Обувь';
    case 'amulet':
      return 'Амулет';
    case 'ring':
      return 'Кольцо';
    case 'pet':
      return 'Питомец';
    default:
      return slot;
  }
}

function appearanceTitle(group: AppearanceKey) {
  switch (group) {
    case 'face':
      return 'Лицо';
    case 'hair':
      return 'Причёска';
    case 'color':
      return 'Цвет волос';
    default:
      return group;
  }
}
