import { z } from 'zod';
import type {
  EnemyDefinition,
  ItemDefinition,
  LocationDefinition,
  QuestDefinition,
  Race,
  SceneDefinition,
  StatKey,
} from '@lov2/shared';

export const GAME_DATA_VERSION = '2026.04.vertical-slice.1';

export const STAT_KEYS: StatKey[] = ['сила', 'ловкость', 'интуиция', 'удача'];

export const gameAssetIds = [
  'scene-hub',
  'scene-tavern',
  'scene-map',
  'scene-combat',
  'scene-inventory',
  'scene-character',
  'scene-pets',
  'scene-journal',
  'hero-nocturne',
  'enemy-ash-baron',
  'pet-wyvern',
  'icon-rapier',
  'icon-vest',
  'icon-onyx',
  'icon-wyvern',
] as const;

export const races: Race[] = [
  {
    id: 'nocturne',
    nameRu: 'Ноктюрн',
    descriptionRu: 'Потомки ночных домов. Выдерживают долгие дуэли и быстрее лечатся после боя.',
    passiveRu: '+10 к здоровью и устойчивости в путешествиях.',
    baseStats: { сила: 12, ловкость: 10, интуиция: 10, удача: 8 },
  },
  {
    id: 'veiled',
    nameRu: 'Завесники',
    descriptionRu: 'Ловкие разведчики туманных улиц. Часто уходят от ударов и находят редкую добычу.',
    passiveRu: '+2 к ловкости и +1 к удаче.',
    baseStats: { сила: 9, ловкость: 14, интуиция: 9, удача: 11 },
  },
  {
    id: 'oracle',
    nameRu: 'Оракулы',
    descriptionRu: 'Тихие стратеги с острым чутьем. Лучше читают противника и критические моменты.',
    passiveRu: '+3 к интуиции.',
    baseStats: { сила: 9, ловкость: 9, интуиция: 15, удача: 10 },
  },
];

export const items: ItemDefinition[] = [
  {
    id: 'duelist-rapier',
    nameRu: 'Рапира дуэлянта',
    descriptionRu: 'Легкий клинок для первых ночных контрактов.',
    iconAssetId: 'icon-rapier',
    slot: 'weapon',
    rarity: 'uncommon',
    priceGold: 120,
    statBonus: { сила: 3, ловкость: 2 },
  },
  {
    id: 'moon-vest',
    nameRu: 'Лунный жилет',
    descriptionRu: 'Гибкая броня с серебряной нитью.',
    iconAssetId: 'icon-vest',
    slot: 'armor',
    rarity: 'uncommon',
    priceGold: 160,
    statBonus: { сила: 2, интуиция: 2 },
  },
  {
    id: 'lucky-onyx',
    nameRu: 'Оникс удачи',
    descriptionRu: 'Темный камень, теплый на ладони.',
    iconAssetId: 'icon-onyx',
    slot: 'amulet',
    rarity: 'rare',
    priceGold: 280,
    statBonus: { удача: 4 },
  },
  {
    id: 'ember-whelp',
    nameRu: 'Искровой виверн',
    descriptionRu: 'Маленький спутник, рычащий на тени.',
    iconAssetId: 'icon-wyvern',
    slot: 'pet',
    rarity: 'rare',
    priceGold: 400,
    statBonus: { интуиция: 2, удача: 2 },
  },
];

export const locations: LocationDefinition[] = [
  {
    id: 'old-tavern',
    nameRu: 'Старая таверна',
    descriptionRu: 'Теплый зал у мостовой, где шепотом продают ночные поручения.',
    travelSeconds: 4,
    sceneAssetId: 'scene-tavern',
  },
  {
    id: 'fog-harbor',
    nameRu: 'Туманный причал',
    descriptionRu: 'Лодки скрипят у черной воды, а на острове горит одинокая башня.',
    travelSeconds: 8,
    sceneAssetId: 'scene-map',
  },
  {
    id: 'crimson-arena',
    nameRu: 'Багряная арена',
    descriptionRu: 'Каменный круг для дуэлей, освещенный медными чашами огня.',
    travelSeconds: 10,
    sceneAssetId: 'scene-combat',
  },
];

export const enemies: EnemyDefinition[] = [
  {
    id: 'mist-bandit',
    nameRu: 'Туманный налетчик',
    level: 1,
    health: 55,
    boss: false,
    stats: { сила: 6, ловкость: 5, интуиция: 4, удача: 3 },
    reward: { experience: 70, gold: 35, gems: 0, itemIds: ['duelist-rapier'] },
  },
  {
    id: 'harbor-wraith',
    nameRu: 'Причальный призрак',
    level: 3,
    health: 115,
    boss: false,
    stats: { сила: 10, ловкость: 7, интуиция: 9, удача: 5 },
    reward: { experience: 140, gold: 80, gems: 1, itemIds: ['moon-vest'] },
  },
  {
    id: 'baron-of-ashes',
    nameRu: 'Барон Пепла',
    level: 5,
    health: 210,
    boss: true,
    stats: { сила: 16, ловкость: 11, интуиция: 13, удача: 8 },
    reward: { experience: 320, gold: 180, gems: 4, itemIds: ['lucky-onyx', 'ember-whelp'] },
  },
];

export const quests: QuestDefinition[] = [
  {
    id: 'tavern-first-contract',
    titleRu: 'Первый ночной контракт',
    descriptionRu: 'Хозяин таверны просит прогнать налетчика с мостовой.',
    locationId: 'old-tavern',
    enemyId: 'mist-bandit',
    energyCost: 2,
    reward: { experience: 90, gold: 45, gems: 0, itemIds: ['duelist-rapier'] },
  },
  {
    id: 'harbor-lantern',
    titleRu: 'Фонарь на причале',
    descriptionRu: 'На пристани гаснет зеленый огонь. Нужно узнать, кто крадет свет.',
    locationId: 'fog-harbor',
    enemyId: 'harbor-wraith',
    energyCost: 3,
    reward: { experience: 160, gold: 90, gems: 1, itemIds: ['moon-vest'] },
  },
  {
    id: 'ash-baron-duel',
    titleRu: 'Дуэль с Бароном Пепла',
    descriptionRu: 'Первый настоящий босс вертикального среза. Победа открывает перерождение позже.',
    locationId: 'crimson-arena',
    enemyId: 'baron-of-ashes',
    energyCost: 4,
    reward: { experience: 360, gold: 220, gems: 5, itemIds: ['lucky-onyx', 'ember-whelp'] },
  },
];

export const sceneDefinitions: SceneDefinition[] = [
  {
    id: 'hub',
    nameRu: 'Ночной двор',
    descriptionRu: 'Главная площадь с фонтаном, таверной, дорогами и городскими службами.',
    sceneAssetId: 'scene-hub',
    ambientLayerIds: ['fountain', 'lanterns', 'moon-haze'],
    hotspots: [
      {
        id: 'hub-tavern',
        labelRu: 'Таверна',
        descriptionRu: 'Контракты, слухи и первые ночные поручения.',
        rect: { x: 0.65, y: 0.34, width: 0.25, height: 0.28 },
        action: { type: 'openScene', sceneId: 'tavern' },
      },
      {
        id: 'hub-map',
        labelRu: 'Путь',
        descriptionRu: 'Маршруты к пристани, арене и старым кварталам.',
        rect: { x: 0.05, y: 0.55, width: 0.24, height: 0.26 },
        action: { type: 'openScene', sceneId: 'map' },
      },
      {
        id: 'hub-arena',
        labelRu: 'Дуэль',
        descriptionRu: 'Здесь появляются ожидающие бои и боссовые вызовы.',
        rect: { x: 0.4, y: 0.35, width: 0.2, height: 0.38 },
        action: { type: 'openScene', sceneId: 'combat' },
      },
      {
        id: 'hub-inventory',
        labelRu: 'Инвентарь',
        descriptionRu: 'Снаряжение, находки и быстрый доступ к экипировке.',
        rect: { x: 0.79, y: 0.68, width: 0.15, height: 0.18 },
        action: { type: 'openScene', sceneId: 'inventory' },
      },
      {
        id: 'hub-character',
        labelRu: 'Герой',
        descriptionRu: 'Характеристики, очки развития и перерождение.',
        rect: { x: 0.42, y: 0.12, width: 0.16, height: 0.2 },
        action: { type: 'openScene', sceneId: 'character' },
      },
      {
        id: 'hub-pets',
        labelRu: 'Питомцы',
        descriptionRu: 'Спутники, бонусы и будущий рост питомцев.',
        rect: { x: 0.17, y: 0.24, width: 0.16, height: 0.18 },
        action: { type: 'openScene', sceneId: 'pets' },
      },
      {
        id: 'hub-journal',
        labelRu: 'Журнал',
        descriptionRu: 'События, новости клана и социальные уведомления.',
        rect: { x: 0.02, y: 0.14, width: 0.15, height: 0.24 },
        action: { type: 'openScene', sceneId: 'journal' },
      },
    ],
  },
  {
    id: 'tavern',
    nameRu: 'Таверна у моста',
    descriptionRu: 'Теплый зал с хозяином, доской контрактов и столом странников.',
    sceneAssetId: 'scene-tavern',
    ambientLayerIds: ['hearth', 'candles', 'mug-shine'],
    hotspots: [
      {
        id: 'tavern-board',
        labelRu: 'Доска контрактов',
        descriptionRu: 'Выберите заказ и получите маршрут.',
        rect: { x: 0.61, y: 0.18, width: 0.24, height: 0.35 },
        action: { type: 'openPanel', panelId: 'contracts' },
      },
      {
        id: 'tavern-keeper',
        labelRu: 'Хозяин',
        descriptionRu: 'Рассказывает, какие дороги сегодня опасны.',
        rect: { x: 0.35, y: 0.2, width: 0.2, height: 0.36 },
        action: { type: 'openPanel', panelId: 'contracts' },
      },
      {
        id: 'tavern-travel',
        labelRu: 'Карта на столе',
        descriptionRu: 'Перейти к маршрутам и таймерам пути.',
        rect: { x: 0.44, y: 0.62, width: 0.28, height: 0.18 },
        action: { type: 'openScene', sceneId: 'map' },
      },
      {
        id: 'tavern-exit',
        labelRu: 'Во двор',
        descriptionRu: 'Вернуться на главную площадь.',
        rect: { x: 0.02, y: 0.62, width: 0.16, height: 0.24 },
        action: { type: 'openScene', sceneId: 'hub' },
      },
    ],
  },
  {
    id: 'map',
    nameRu: 'Карта туманных дорог',
    descriptionRu: 'Маршруты открываются через контракты и приводят к дуэлям.',
    sceneAssetId: 'scene-map',
    ambientLayerIds: ['water', 'route-glow', 'beacon'],
    hotspots: [
      {
        id: 'route-tavern',
        labelRu: 'Старая таверна',
        descriptionRu: 'Короткий путь к первому ночному контракту.',
        rect: { x: 0.18, y: 0.54, width: 0.18, height: 0.18 },
        action: { type: 'travelNode', locationId: 'old-tavern', questId: 'tavern-first-contract' },
      },
      {
        id: 'route-harbor',
        labelRu: 'Туманный причал',
        descriptionRu: 'Лодки, зеленый фонарь и опасная вода.',
        rect: { x: 0.48, y: 0.42, width: 0.22, height: 0.2 },
        action: { type: 'travelNode', locationId: 'fog-harbor', questId: 'harbor-lantern' },
      },
      {
        id: 'route-arena',
        labelRu: 'Багряная арена',
        descriptionRu: 'Боссовый путь к Барону Пепла.',
        rect: { x: 0.72, y: 0.2, width: 0.2, height: 0.22 },
        action: { type: 'travelNode', locationId: 'crimson-arena', questId: 'ash-baron-duel' },
      },
      {
        id: 'map-travel-panel',
        labelRu: 'Текущий путь',
        descriptionRu: 'Проверить таймер и забрать встречу.',
        rect: { x: 0.34, y: 0.76, width: 0.34, height: 0.14 },
        action: { type: 'openPanel', panelId: 'travel' },
      },
    ],
  },
  {
    id: 'combat',
    nameRu: 'Церемониальная дуэль',
    descriptionRu: 'Стороны сходятся в коротком серверном бою с наградой.',
    sceneAssetId: 'scene-combat',
    ambientLayerIds: ['braziers', 'hit-flash', 'dust'],
    hotspots: [
      {
        id: 'combat-enemy',
        labelRu: 'Противник',
        descriptionRu: 'Начать ожидающую дуэль или посмотреть последний бой.',
        rect: { x: 0.62, y: 0.28, width: 0.24, height: 0.46 },
        action: { type: 'combatNode' },
      },
      {
        id: 'combat-result',
        labelRu: 'Награда',
        descriptionRu: 'Последний результат, опыт, золото и добыча.',
        rect: { x: 0.38, y: 0.76, width: 0.24, height: 0.14 },
        action: { type: 'openPanel', panelId: 'reward' },
      },
    ],
  },
  {
    id: 'inventory',
    nameRu: 'Снаряжение',
    descriptionRu: 'Бумажная кукла героя, слоты экипировки и сумка.',
    sceneAssetId: 'scene-inventory',
    ambientLayerIds: ['gem-glow', 'paper-doll'],
    hotspots: [
      {
        id: 'inventory-grid',
        labelRu: 'Сумка',
        descriptionRu: 'Открыть предметы и экипировать доступную находку.',
        rect: { x: 0.08, y: 0.18, width: 0.32, height: 0.54 },
        action: { type: 'openPanel', panelId: 'inventory' },
      },
      {
        id: 'inventory-equip',
        labelRu: 'Экипировать',
        descriptionRu: 'Быстро надеть первый доступный предмет.',
        rect: { x: 0.44, y: 0.62, width: 0.18, height: 0.18 },
        action: { type: 'equipFirst' },
      },
      {
        id: 'inventory-stats',
        labelRu: 'Характеристики',
        descriptionRu: 'Перейти к росту героя.',
        rect: { x: 0.72, y: 0.18, width: 0.2, height: 0.32 },
        action: { type: 'openScene', sceneId: 'character' },
      },
    ],
  },
  {
    id: 'character',
    nameRu: 'Зал героя',
    descriptionRu: 'Рост характеристик, уровень, здоровье и перерождение.',
    sceneAssetId: 'scene-character',
    ambientLayerIds: ['fireplace', 'stat-runes'],
    hotspots: [
      {
        id: 'character-stats',
        labelRu: 'Статы',
        descriptionRu: 'Распределить силу, ловкость, интуицию и удачу.',
        rect: { x: 0.08, y: 0.2, width: 0.34, height: 0.5 },
        action: { type: 'openPanel', panelId: 'character' },
      },
      {
        id: 'character-inventory',
        labelRu: 'Снаряжение',
        descriptionRu: 'Посмотреть экипировку героя.',
        rect: { x: 0.68, y: 0.55, width: 0.24, height: 0.22 },
        action: { type: 'openScene', sceneId: 'inventory' },
      },
      {
        id: 'character-pets',
        labelRu: 'Питомец',
        descriptionRu: 'Открыть спутника и его бонусы.',
        rect: { x: 0.58, y: 0.18, width: 0.2, height: 0.22 },
        action: { type: 'openScene', sceneId: 'pets' },
      },
    ],
  },
  {
    id: 'pets',
    nameRu: 'Угол спутников',
    descriptionRu: 'Место для питомца, бонусов и будущего роста.',
    sceneAssetId: 'scene-pets',
    ambientLayerIds: ['pet-idle', 'nest-glow'],
    hotspots: [
      {
        id: 'pets-active',
        labelRu: 'Активный питомец',
        descriptionRu: 'Проверить спутника и бонусы.',
        rect: { x: 0.32, y: 0.26, width: 0.32, height: 0.44 },
        action: { type: 'openPanel', panelId: 'pets' },
      },
      {
        id: 'pets-inventory',
        labelRu: 'Сумка',
        descriptionRu: 'Найти предметы для питомца.',
        rect: { x: 0.72, y: 0.58, width: 0.2, height: 0.22 },
        action: { type: 'openScene', sceneId: 'inventory' },
      },
    ],
  },
  {
    id: 'journal',
    nameRu: 'Летопись ночи',
    descriptionRu: 'Журнал событий, системные уведомления и будущая социальная лента.',
    sceneAssetId: 'scene-journal',
    ambientLayerIds: ['paper-glow', 'seal-pulse'],
    hotspots: [
      {
        id: 'journal-feed',
        labelRu: 'Лента событий',
        descriptionRu: 'Открыть последние события вертикального среза.',
        rect: { x: 0.16, y: 0.16, width: 0.48, height: 0.62 },
        action: { type: 'openPanel', panelId: 'journal' },
      },
      {
        id: 'journal-contracts',
        labelRu: 'Контракты',
        descriptionRu: 'Быстрый переход к заданиям таверны.',
        rect: { x: 0.7, y: 0.24, width: 0.18, height: 0.18 },
        action: { type: 'openScene', sceneId: 'tavern' },
      },
    ],
  },
];

const idSchema = z.string().min(2);
const dataSchema = z.object({
  version: z.string(),
  races: z.array(z.object({ id: idSchema })),
  items: z.array(z.object({ id: idSchema })),
  locations: z.array(z.object({ id: idSchema })),
  enemies: z.array(z.object({ id: idSchema })),
  quests: z.array(z.object({ id: idSchema })),
  scenes: z.array(z.object({ id: idSchema })),
});

export const gameData = {
  version: GAME_DATA_VERSION,
  races,
  items,
  locations,
  enemies,
  quests,
  scenes: sceneDefinitions,
};

export function validateGameData(): void {
  dataSchema.parse(gameData);

  const ids = new Set<string>();
  for (const collection of [races, items, locations, enemies, quests, sceneDefinitions]) {
    for (const entry of collection) {
      if (ids.has(entry.id)) {
        throw new Error(`duplicate game data id: ${entry.id}`);
      }
      ids.add(entry.id);
    }
  }

  for (const quest of quests) {
    if (!locations.some((location) => location.id === quest.locationId)) {
      throw new Error(`quest ${quest.id} references missing location ${quest.locationId}`);
    }
    if (!enemies.some((enemy) => enemy.id === quest.enemyId)) {
      throw new Error(`quest ${quest.id} references missing enemy ${quest.enemyId}`);
    }
  }

  const knownAssetIds = new Set<string>(gameAssetIds);
  for (const item of items) {
    if (!knownAssetIds.has(item.iconAssetId)) {
      throw new Error(`item ${item.id} references missing icon asset ${item.iconAssetId}`);
    }
  }

  for (const scene of sceneDefinitions) {
    if (!knownAssetIds.has(scene.sceneAssetId)) {
      throw new Error(`scene ${scene.id} references missing asset ${scene.sceneAssetId}`);
    }

    const hotspotIds = new Set<string>();
    for (const hotspot of scene.hotspots) {
      if (hotspotIds.has(hotspot.id)) {
        throw new Error(`scene ${scene.id} has duplicate hotspot ${hotspot.id}`);
      }
      hotspotIds.add(hotspot.id);

      const { x, y, width, height } = hotspot.rect;
      if (x < 0 || y < 0 || width <= 0 || height <= 0 || x + width > 1 || y + height > 1) {
        throw new Error(`scene ${scene.id} hotspot ${hotspot.id} is outside normalized bounds`);
      }

      const { action } = hotspot;
      if (action.type === 'openScene') {
        if (!sceneDefinitions.some((entry) => entry.id === action.sceneId)) {
          throw new Error(`hotspot ${hotspot.id} references missing scene ${action.sceneId}`);
        }
      }

      if (action.type === 'travelNode') {
        if (!locations.some((location) => location.id === action.locationId)) {
          throw new Error(`hotspot ${hotspot.id} references missing location ${action.locationId}`);
        }
        if (
          action.questId &&
          !quests.some((quest) => quest.id === action.questId)
        ) {
          throw new Error(`hotspot ${hotspot.id} references missing quest ${action.questId}`);
        }
      }
    }
  }
}

validateGameData();
