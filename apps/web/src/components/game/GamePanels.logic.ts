import type { FocusEvent, PointerEvent } from 'react';
import {
  armorFromEquipment,
  itemArmorWithEnhancement,
  itemStatsWithEnhancement,
  maxHealthForStats,
  statsWithEquipment,
  type BootstrapState,
  type CharacterStats,
  type EquipmentSlot,
  type InventoryStack,
  type ItemDefinition,
  type Race,
  type StatKey,
  type TravelTask,
} from '@lov2/shared';
import {
  CLASS_BONUSES,
  DRAG_STACK_TYPE,
  DRAG_STORE_ITEM_TYPE,
  PRIMARY_STATS,
  SLOT_LABELS,
  STAT_AGILITY,
  STAT_INTUITION,
  STAT_LUCK,
  STAT_STRENGTH,
  type AppearanceKey,
} from './GamePanels.data.js';
export type EquippedEntry = { stack: InventoryStack; item: ItemDefinition };
export type BreakdownKey = StatKey | 'health' | 'armor';
export type StatBreakdownLine = {
  label: string;
  value: string;
  tone?: 'total';
};
export type StatBreakdown = {
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

export function setItemHoverPosition(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty('--item-tooltip-x', `${event.clientX}px`);
  event.currentTarget.style.setProperty('--item-tooltip-y', `${event.clientY}px`);
}

export function setItemHoverPositionFromFocus(event: FocusEvent<HTMLElement>) {
  const rect = event.currentTarget.getBoundingClientRect();
  event.currentTarget.style.setProperty('--item-tooltip-x', `${rect.right}px`);
  event.currentTarget.style.setProperty('--item-tooltip-y', `${rect.top + rect.height / 2}px`);
}

export function buildCharacterTotals(state: BootstrapState, equippedEntries: EquippedEntry[]) {
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

export function buildProfileSummaryStats(
  character: NonNullable<BootstrapState['character']>,
  totals: ReturnType<typeof buildCharacterTotals>,
) {
  return [
    { id: 'health', label: '\u0417\u0434\u043e\u0440\u043e\u0432\u044c\u0435', value: character.maxHealth },
    { id: 'armor', label: '\u0411\u0440\u043e\u043d\u044f', value: totals.armor },
    { id: 'strength', label: '\u0421\u0438\u043b\u0430', value: totals.stats[STAT_STRENGTH] },
    { id: 'agility', label: '\u041b\u043e\u0432\u043a\u043e\u0441\u0442\u044c', value: totals.stats[STAT_AGILITY] },
    { id: 'intuition', label: '\u0418\u043d\u0442\u0443\u0438\u0446\u0438\u044f', value: totals.stats[STAT_INTUITION] },
    { id: 'luck', label: '\u0423\u0434\u0430\u0447\u0430', value: totals.stats[STAT_LUCK] },
  ];
}

export function buildHealthBreakdown(
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

export function buildArmorBreakdown(
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

export function buildStatBreakdowns(
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

export function buildDamageRange(stats: CharacterStats) {
  const min = Math.max(1, Math.round(stats[STAT_STRENGTH] * 2.2));
  const max = Math.max(min + 1, Math.round(stats[STAT_STRENGTH] * 3.2));
  return `${min}-${max}`;
}

export function getBackpackStacks(state: BootstrapState) {
  return state.inventory.filter((stack) => !stack.equippedSlot);
}

export function orderBackpackStacks(stacks: InventoryStack[], slotOrder: Record<string, number>, fillSlots: number) {
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

export function findNextOpenInventoryCell(cells: Array<InventoryStack | null>, startIndex: number) {
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

export function getEquippedBySlot(state: BootstrapState) {
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

export function getItemStatTags(item: ItemDefinition, enhancementLevel = 0) {
  const stats = itemStatsWithEnhancement(item, enhancementLevel);
  const tags = Object.entries(stats)
    .filter(([, value]) => (value ?? 0) > 0)
    .map(([key, value]) => `${statTitle(key as StatKey)} +${value}`);

  if (item.armorBonus) {
    tags.push(`Броня +${item.armorBonus + enhancementLevel * 2}`);
  }

  return tags.length ? tags : ['Без бонусов к характеристикам'];
}

export function formatPrice(item: ItemDefinition) {
  return item.priceGems && item.priceGems > 0 ? `${item.priceGems} жемчужин` : `${item.priceGold} золота`;
}

export function readDraggedStackId(event: { dataTransfer: DataTransfer }) {
  const inventoryStackId = event.dataTransfer.getData(DRAG_STACK_TYPE);
  return inventoryStackId || null;
}

export function readDraggedStoreItemId(event: { dataTransfer: DataTransfer }) {
  const itemId = event.dataTransfer.getData(DRAG_STORE_ITEM_TYPE);
  return itemId || null;
}

export function buildTravelProgress(travel: TravelTask, now: number) {
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

export function formatDuration(seconds: number) {
  const total = Math.max(0, seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;
  return [hours, minutes, remainder].map((part) => `${part}`.padStart(2, '0')).join(':');
}

export function statTitle(stat: StatKey) {
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

export function slotTitle(slot: EquipmentSlot) {
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

export function appearanceTitle(group: AppearanceKey) {
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

