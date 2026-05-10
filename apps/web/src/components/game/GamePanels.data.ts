import type { CharacterStats, EquipmentSlot, StatKey } from '@lov2/shared';
import type { MetaTab } from '../../game/types.js';
export type StoreTab = 'shop' | 'work' | 'contracts';
export type AppearanceKey = 'face' | 'hair' | 'color';
export type AppearanceOption = { id: string; label: string; swatch?: string; imageAssetId?: string };
export type WindowSize = 'compact' | 'standard' | 'wide' | 'hero';
export type WindowBodyScroll = 'none' | 'body' | 'sections';

export const DRAG_STACK_TYPE = 'application/x-lov2-stack';
export const DRAG_STORE_ITEM_TYPE = 'application/x-lov2-store-item';
export const STAT_STRENGTH = '\u0441\u0438\u043b\u0430' as StatKey;
export const STAT_AGILITY = '\u043b\u043e\u0432\u043a\u043e\u0441\u0442\u044c' as StatKey;
export const STAT_INTUITION = '\u0438\u043d\u0442\u0443\u0438\u0446\u0438\u044f' as StatKey;
export const STAT_LUCK = '\u0443\u0434\u0430\u0447\u0430' as StatKey;
export const LEFT_SLOTS: EquipmentSlot[] = ['weapon', 'ring', 'amulet', 'pet'];
export const RIGHT_SLOTS: EquipmentSlot[] = ['helmet', 'armor', 'gloves', 'boots'];
export const PRIMARY_STATS: StatKey[] = [STAT_STRENGTH, STAT_AGILITY, STAT_INTUITION, STAT_LUCK];
export const SLOT_HINTS: Record<EquipmentSlot, string> = {
  weapon: '⚔',
  helmet: '⌂',
  armor: '▣',
  gloves: '✋',
  boots: '⌵',
  amulet: '◈',
  ring: '◌',
  pet: '✦',
};
export const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'Оружие',
  helmet: 'Шлем',
  armor: 'Броня',
  gloves: 'Перчатки',
  boots: 'Обувь',
  amulet: 'Амулет',
  ring: 'Кольцо',
  pet: 'Питомец',
};
export const META_LABELS: Record<MetaTab, string> = {
  news: 'Новости',
  faq: 'F.A.Q',
  fanclub: 'Фан-клуб',
  help: 'Помощь',
};
export const CLASS_BONUSES: Record<string, Partial<CharacterStats>> = {
  swordsman: { [STAT_STRENGTH]: 7 },
  ranger: { [STAT_AGILITY]: 7 },
  mage: { [STAT_INTUITION]: 7 },
};
export const APPEARANCE_OPTIONS: Record<AppearanceKey, AppearanceOption[]> = {
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
export const PROFILE_REWARDS = [
  { id: 'reward-1', label: 'Печать двора', accent: 'ember' },
  { id: 'reward-2', label: 'Жемчужный знак', accent: 'moon' },
  { id: 'reward-3', label: 'Пусто', accent: 'empty' },
  { id: 'reward-4', label: 'Сумка удачи', accent: 'gold' },
  { id: 'reward-5', label: 'Игральные кости', accent: 'mint' },
  { id: 'reward-6', label: 'Пусто', accent: 'empty' },
];
export const PET_VARIANTS = [
  { id: 'foxling', name: 'Лисёнок', level: 12, hp: 1800, damage: '34-35', assetId: 'pet-wolf' },
  { id: 'wyrmlet', name: 'Дракончик', level: 14, hp: 1950, damage: '36-38', assetId: 'pet-dragon' },
  { id: 'kitten', name: 'Котёнок', level: 17, hp: 2100, damage: '40-41', assetId: 'pet-cat' },
  { id: 'ember-whelp', name: 'Искровой виверн', level: 12, hp: 1800, damage: '-', assetId: 'pet-wyvern' },
];
export const STORE_CONTRACTS = [
  { title: 'Договор на сезон', price: '1000 ОК', profit: '1620 жемчужин за 90 дней' },
  { title: 'Договор на месяц', price: '250 ОК', profit: '270 жемчужин за 30 дней' },
  { title: 'Договор на 10 дней', price: '100 ОК', profit: '60 жемчужин за 10 дней' },
];
export const PAYMENT_OFFERS = [
  { id: 'gold-small', title: '1000 золота', price: '$1', note: 'Для покупок в магазине и оплаты улучшений', tone: 'gold' },
  { id: 'pearls-small', title: '100 жемчужин', price: '$2', note: 'Для энергии, ускорений и редких возможностей', tone: 'pearl' },
  { id: 'gold-large', title: '6000 золота', price: '$5', note: 'Запас для кузницы и раннего снаряжения', tone: 'gold' },
  { id: 'pearls-large', title: '600 жемчужин', price: '$10', note: 'Лучший запас для длительной игры', tone: 'pearl' },
];
export const LEADERBOARD_CATEGORIES = [
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
export const LEADERBOARD_COPY = {
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

export const TOWER_HALLS = [
  { id: 'skeletons', title: 'Зал скелетов', progress: 20, total: 20, completed: true, locked: false, image: 'scene-character' },
  { id: 'zombies', title: 'Зал зомби', progress: 15, total: 20, completed: false, locked: false, image: 'scene-hub' },
  { id: 'mummies', title: 'Зал мумий', progress: 10, total: 20, completed: false, locked: false, image: 'scene-tavern' },
  { id: 'ice', title: 'Ледяной зал', progress: 10, total: 20, completed: false, locked: false, image: 'scene-map' },
  { id: 'east', title: 'Восточный зал', progress: 10, total: 20, completed: false, locked: false, image: 'scene-journal' },
  { id: 'death', title: 'Зал смерти', progress: 0, total: 20, completed: false, locked: true, image: 'scene-combat' },
];
export const JOURNAL_COPY: Record<MetaTab, Array<{ title: string; text: string }>> = {
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
export const EXERCISE_BRIEFS: Record<
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
export const QUEST_HINTS: Record<string, string> = {
  'tavern-first-contract':
    'Иди прямо, направо, налево. Только не забудься в пути и помни: осторожность сегодня важнее скорости.',
  'harbor-lantern':
    'Смотри на отражения в воде, а не на сам огонь. Иногда след виден только сбоку и только с нужного камня.',
  'ash-baron-duel':
    'Выходи к арене без спешки. Барон любит долгий разогрев и теряет ритм, если его встречают хладнокровно.',
};
