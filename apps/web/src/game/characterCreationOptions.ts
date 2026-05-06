import type { CharacterClassId, CharacterGender } from '@lov2/shared';


export const GENDER_OPTIONS: Array<{
  id: CharacterGender;
  label: string;
  glyph: string;
}> = [
  { id: 'male', label: 'Мужчина', glyph: '♂' },
  { id: 'female', label: 'Женщина', glyph: '♀' },
];

export const CLASS_OPTIONS: Array<{
  id: CharacterClassId;
  label: string;
  glyph: string;
  description: string;
}> = [
  {
    id: 'swordsman',
    label: 'Мечник',
    glyph: '⚔',
    description:
      'Мечники — самые сильные и чрезвычайно выносливые воины. Вместе с мечами они используют прочные щиты и уверенно держат фронт в долгом бою.',
  },
  {
    id: 'ranger',
    label: 'Стрелок',
    glyph: '🏹',
    description:
      'Стрелки полагаются на ловкость, дистанцию и быстрые вылазки. Они лучше других читают маршрут, первыми замечают опасность и точнее держат темп боя.',
  },
  {
    id: 'mage',
    label: 'Мистик',
    glyph: '✦',
    description:
      'Мистики играют от интуиции и контроля. Их сила раскрывается в точных решениях, магических импульсах и умении переломить дуэль в нужный момент.',
  },
];

export const RANDOM_NAMES = ['Даррид', 'Нарек', 'Элира', 'Каэл', 'Мирель', 'Селвин'];