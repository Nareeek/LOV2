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

export const GAME_DATA_VERSION = '2026.04.vertical-slice.2';

export const STAT_KEYS: StatKey[] = ['сила', 'ловкость', 'интуиция', 'удача'];

export interface ExerciseDefinition {
  id: string;
  titleRu: string;
  subtitleRu: string;
  descriptionRu: string;
  locationHintRu: string;
  recommendedLevelRu: string;
  tone: 'gold' | 'mint' | 'ember';
}

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
    forgeable: true,
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
    armorBonus: 8,
    forgeable: true,
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
    forgeable: true,
    statBonus: { удача: 4 },
  },
  {
    id: 'ember-whelp',
    nameRu: 'Искровой виверн',
    descriptionRu: 'Маленький спутник, рычащий на тени.',
    iconAssetId: 'icon-wyvern',
    slot: 'pet',
    rarity: 'rare',
    priceGold: 0,
    priceGems: 3,
    statBonus: { интуиция: 2, удача: 2 },
    petCombatStats: { level: 12, health: 1800 },
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
    nameRu: 'Пристань туманов',
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
    health: 550,
    armor: 3,
    boss: false,
    stats: { сила: 6, ловкость: 5, интуиция: 4, удача: 3 },
    reward: { experience: 70, gold: 35, gems: 0, itemIds: ['duelist-rapier'] },
  },
  {
    id: 'harbor-wraith',
    nameRu: 'Причальный призрак',
    level: 3,
    health: 115,
    armor: 7,
    boss: false,
    stats: { сила: 10, ловкость: 7, интуиция: 9, удача: 5 },
    reward: { experience: 140, gold: 80, gems: 1, itemIds: ['moon-vest'] },
  },
  {
    id: 'baron-of-ashes',
    nameRu: 'Барон Пепла',
    level: 5,
    health: 2100,
    armor: 140,
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

export const exerciseDefinitions: ExerciseDefinition[] = [
  {
    id: 'courtyard-lanterns',
    titleRu: 'Ночной дозор',
    subtitleRu: 'Упражнение',
    descriptionRu: 'Стража просит пройтись по кварталу и проверить, где гаснут фонари. Это отдельное городское поручение, а не таверненный контракт на бой.',
    locationHintRu: 'Двор заката',
    recommendedLevelRu: 'для 1-3 уровня',
    tone: 'mint',
  },
  {
    id: 'harbor-rumors',
    titleRu: 'Шепот у пристани',
    subtitleRu: 'Слухи',
    descriptionRu: 'Рыбаки передают слухи о странниках и редких гостях. Подсказка ведет к лодочнику и прибрежным разговорам, а не в список контрактов.',
    locationHintRu: 'Пристань туманов',
    recommendedLevelRu: 'для 2-4 уровня',
    tone: 'gold',
  },
  {
    id: 'tower-whispers',
    titleRu: 'Эхо башни',
    subtitleRu: 'Напоминание',
    descriptionRu: 'Смотрители напоминают, что башня хранит испытания и закрытые залы. Сейчас это отдельная справка о месте и будущем прогрессе.',
    locationHintRu: 'Темная башня',
    recommendedLevelRu: 'для 4+ уровня',
    tone: 'ember',
  },
];

export const sceneDefinitions: SceneDefinition[] = [
  {
    id: 'hub',
    nameRu: 'Домашний двор',
    descriptionRu: 'Главная площадь с фонтаном, таверной, ареной, рынком и дорогой к пристани.',
    sceneAssetId: 'scene-hub',
    ambientLayerIds: ['fountain', 'lanterns', 'moon-haze'],
    hotspots: [
      {
        id: 'hub-tavern',
        labelRu: 'Таверна',
        descriptionRu: 'Контракты на вылазки, траты энергии и дорога к монстрам.',
        rect: { x: 0.02, y: 0.5, width: 0.25, height: 0.34 },
        action: { type: 'openPanel', panelId: 'contracts' },
        visual: { kind: 'door', accent: 'gold', labelSide: 'top' },
      },
      {
        id: 'hub-arena',
        labelRu: 'Арена',
        descriptionRu: 'Доска дуэлей и быстрый вызов соперника.',
        rect: { x: 0.32, y: 0.15, width: 0.3, height: 0.32 },
        action: { type: 'openPanel', panelId: 'arena' },
        visual: { kind: 'arena', accent: 'ember', labelSide: 'bottom' },
      },
      {
        id: 'hub-store',
        labelRu: 'Магазин',
        descriptionRu: 'Рынок для покупки вещей, зелий и редких спутников.',
        rect: { x: 0.65, y: 0.2, width: 0.31, height: 0.46 },
        action: { type: 'openPanel', panelId: 'store' },
        visual: { kind: 'shop', accent: 'gold', labelSide: 'bottom' },
      },
      {
        id: 'hub-sign',
        labelRu: 'Пристань',
        descriptionRu: 'Деревянный указатель ведет к лодочнику и второму дому.',
        rect: { x: 0.82, y: 0.68, width: 0.16, height: 0.22 },
        action: { type: 'openScene', sceneId: 'map' },
        visual: { kind: 'portal', accent: 'mint', labelSide: 'bottom' },
      },
      {
        id: 'hub-fountain',
        labelRu: 'Фонтан',
        descriptionRu: 'Дух фонтана принимает горсти монет и обещает ночные благословения.',
        rect: { x: 0.34, y: 0.57, width: 0.32, height: 0.34 },
        action: { type: 'openPanel', panelId: 'fountain' },
        visual: { kind: 'portal', accent: 'gold', labelSide: 'top' },
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
        visual: { kind: 'board', accent: 'gold', labelSide: 'top' },
      },
      {
        id: 'tavern-keeper',
        labelRu: 'Хозяин',
        descriptionRu: 'Рассказывает, какие дороги сегодня опасны.',
        rect: { x: 0.35, y: 0.2, width: 0.2, height: 0.36 },
        action: { type: 'openPanel', panelId: 'contracts' },
        visual: { kind: 'npc', accent: 'ember', labelSide: 'top' },
      },
    ],
  },
  {
    id: 'map',
    nameRu: 'Вторая гавань',
    descriptionRu: 'Пристань, кузня, башня боссов и путь к лодочнику.',
    sceneAssetId: 'scene-map',
    ambientLayerIds: ['water', 'route-glow', 'beacon'],
    hotspots: [
      {
        id: 'map-town',
        labelRu: 'Город',
        descriptionRu: 'Извилистая дорожка ведет обратно во двор.',
        rect: { x: 0.05, y: 0.63, width: 0.18, height: 0.22 },
        action: { type: 'openScene', sceneId: 'hub' },
        visual: { kind: 'door', accent: 'gold', labelSide: 'bottom' },
      },
      {
        id: 'map-forge',
        labelRu: 'Кузня',
        descriptionRu: 'Кузнечная мастерская для усиления вещей.',
        rect: { x: 0.04, y: 0.28, width: 0.3, height: 0.38 },
        action: { type: 'openPanel', panelId: 'forge' },
        visual: { kind: 'forge', accent: 'ember', labelSide: 'top' },
      },
      {
        id: 'map-tower',
        labelRu: 'Темная башня',
        descriptionRu: 'Множество тайн хранят ее стены.',
        rect: { x: 0.61, y: 0.24, width: 0.3, height: 0.42 },
        action: { type: 'openPanel', panelId: 'tower' },
        visual: { kind: 'tower', accent: 'moon', labelSide: 'top' },
      },
      {
        id: 'map-boatman',
        labelRu: 'Лодочник',
        descriptionRu: 'Старик укажет путь и предложит дальнюю переправу.',
        rect: { x: 0.65, y: 0.52, width: 0.3, height: 0.34 },
        action: { type: 'openPanel', panelId: 'boatman' },
        visual: { kind: 'boat', accent: 'gold', labelSide: 'bottom' },
      },
    ],
  },
  {
    id: 'combat',
    nameRu: 'Церемониальная дуэль',
    descriptionRu: 'Стороны сходятся в коротком серверном бою с наградой.',
    sceneAssetId: 'scene-combat',
    ambientLayerIds: ['braziers', 'hit-flash', 'dust'],
    hotspots: [],
  },
  {
    id: 'inventory',
    nameRu: 'Снаряжение',
    descriptionRu: 'Бумажная кукла героя, слоты экипировки и сумка.',
    sceneAssetId: 'scene-inventory',
    ambientLayerIds: ['gem-glow', 'paper-doll'],
    hotspots: [],
  },
  {
    id: 'character',
    nameRu: 'Зал героя',
    descriptionRu: 'Рост характеристик, уровень, здоровье и перерождение.',
    sceneAssetId: 'scene-character',
    ambientLayerIds: ['fireplace', 'stat-runes'],
    hotspots: [],
  },
  {
    id: 'pets',
    nameRu: 'Угол спутников',
    descriptionRu: 'Место для питомца, бонусов и будущего роста.',
    sceneAssetId: 'scene-pets',
    ambientLayerIds: ['pet-idle', 'nest-glow'],
    hotspots: [],
  },
  {
    id: 'journal',
    nameRu: 'Летопись ночи',
    descriptionRu: 'Журнал событий, системные уведомления и будущая социальная лента.',
    sceneAssetId: 'scene-journal',
    ambientLayerIds: ['paper-glow', 'seal-pulse'],
    hotspots: [],
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
  exercises: exerciseDefinitions,
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

    if (item.slot !== 'pet' && item.petCombatStats) {
      throw new Error(`non-pet item ${item.id} defines pet combat stats`);
    }

    if (item.slot === 'pet') {
      const stats = item.petCombatStats;
      if (!stats || !Number.isInteger(stats.level) || stats.level <= 0 || !Number.isInteger(stats.health) || stats.health <= 0) {
        throw new Error(`pet item ${item.id} must define positive integer combat stats`);
      }
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
        if (action.questId && !quests.some((quest) => quest.id === action.questId)) {
          throw new Error(`hotspot ${hotspot.id} references missing quest ${action.questId}`);
        }
      }
    }
  }
}

validateGameData();
