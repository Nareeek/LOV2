import { useEffect, useMemo, useState, type CSSProperties, type DragEvent, type ReactNode } from 'react';
import { exerciseDefinitions } from '@lov2/game-data';
import {
  armorFromEquipment,
  forgeUpgradeCost,
  itemStatsWithEnhancement,
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
type StatBreakdown = {
  key: StatKey;
  title: string;
  base: number;
  manual: number;
  equipment: number;
  total: number;
  derivedLabel: string;
  derivedValue: string;
};
type StoreTab = 'shop' | 'work' | 'contracts';
type AppearanceKey = 'face' | 'hair' | 'color';
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
  weapon: 'âš”',
  helmet: 'âŒ‚',
  armor: 'â–£',
  gloves: 'âœ‹',
  boots: 'âŒµ',
  amulet: 'â—ˆ',
  ring: 'â—Œ',
  pet: 'âœ¦',
};
const SLOT_LABELS: Record<EquipmentSlot, string> = {
  weapon: 'ÐžÑ€ÑƒÐ¶Ð¸Ðµ',
  helmet: 'Ð¨Ð»ÐµÐ¼',
  armor: 'Ð‘Ñ€Ð¾Ð½Ñ',
  gloves: 'ÐŸÐµÑ€Ñ‡Ð°Ñ‚ÐºÐ¸',
  boots: 'ÐžÐ±ÑƒÐ²ÑŒ',
  amulet: 'ÐÐ¼ÑƒÐ»ÐµÑ‚',
  ring: 'ÐšÐ¾Ð»ÑŒÑ†Ð¾',
  pet: 'ÐŸÐ¸Ñ‚Ð¾Ð¼ÐµÑ†',
};
const META_LABELS: Record<MetaTab, string> = {
  news: 'ÐÐ¾Ð²Ð¾ÑÑ‚Ð¸',
  faq: 'F.A.Q',
  fanclub: 'Ð¤Ð°Ð½-ÐºÐ»ÑƒÐ±',
  help: 'ÐŸÐ¾Ð¼Ð¾Ñ‰ÑŒ',
};
const CLASS_BONUSES: Record<string, Partial<CharacterStats>> = {
  swordsman: { [STAT_STRENGTH]: 2 },
  ranger: { [STAT_AGILITY]: 2 },
  mage: { [STAT_INTUITION]: 2 },
};
const APPEARANCE_OPTIONS: Record<AppearanceKey, Array<{ id: string; label: string; swatch?: string }>> = {
  face: [
    { id: 'face-1', label: 'Ð¡Ð¿Ð¾ÐºÐ¾Ð¹Ð½Ð¾Ðµ Ð»Ð¸Ñ†Ð¾' },
    { id: 'face-2', label: 'Ð ÐµÐ·ÐºÐ¸Ðµ Ñ‡ÐµÑ€Ñ‚Ñ‹' },
    { id: 'face-3', label: 'Ð¡Ð²ÐµÑ‚Ð»Ñ‹Ð¹ Ð¿Ñ€Ð¾Ñ„Ð¸Ð»ÑŒ' },
  ],
  hair: [
    { id: 'hair-1', label: 'Ð¡Ð¾Ð±Ñ€Ð°Ð½Ð½Ñ‹Ðµ Ð¿Ñ€ÑÐ´Ð¸' },
    { id: 'hair-2', label: 'Ð‘Ð¾ÐµÐ²Ð¾Ð¹ Ð²Ð¸Ñ…Ñ€ÑŒ' },
    { id: 'hair-3', label: 'Ð”Ð»Ð¸Ð½Ð½Ñ‹Ðµ Ð¿Ñ€ÑÐ´Ð¸' },
  ],
  color: [
    { id: 'color-1', label: 'Ð¡Ð²ÐµÑ‚Ð»Ñ‹Ð¹', swatch: '#d3bf8d' },
    { id: 'color-2', label: 'ÐœÐµÐ´Ð½Ñ‹Ð¹', swatch: '#a5664d' },
    { id: 'color-3', label: 'Ð¢ÐµÐ¼Ð½Ñ‹Ð¹', swatch: '#37353d' },
  ],
};
const PROFILE_REWARDS = [
  { id: 'reward-1', label: 'ÐŸÐµÑ‡Ð°Ñ‚ÑŒ Ð´Ð²Ð¾Ñ€Ð°', accent: 'ember' },
  { id: 'reward-2', label: 'Ð–ÐµÐ¼Ñ‡ÑƒÐ¶Ð½Ñ‹Ð¹ Ð·Ð½Ð°Ðº', accent: 'moon' },
  { id: 'reward-3', label: 'ÐŸÑƒÑÑ‚Ð¾', accent: 'empty' },
  { id: 'reward-4', label: 'Ð¡ÑƒÐ¼ÐºÐ° ÑƒÐ´Ð°Ñ‡Ð¸', accent: 'gold' },
  { id: 'reward-5', label: 'Ð˜Ð³Ñ€Ð°Ð»ÑŒÐ½Ñ‹Ðµ ÐºÐ¾ÑÑ‚Ð¸', accent: 'mint' },
  { id: 'reward-6', label: 'ÐŸÑƒÑÑ‚Ð¾', accent: 'empty' },
];
const PET_VARIANTS = [
  { id: 'foxling', name: 'Ð›Ð¸ÑÑ‘Ð½Ð¾Ðº', level: 12, hp: 1800, damage: '34-35' },
  { id: 'wyrmlet', name: 'Ð”Ñ€Ð°ÐºÐ¾Ð½Ñ‡Ð¸Ðº', level: 14, hp: 1950, damage: '36-38' },
  { id: 'kitten', name: 'ÐšÐ¾Ñ‚Ñ‘Ð½Ð¾Ðº', level: 17, hp: 2100, damage: '40-41' },
];
const STORE_CONTRACTS = [
  { title: 'Ð”Ð¾Ð³Ð¾Ð²Ð¾Ñ€ Ð½Ð° ÑÐµÐ·Ð¾Ð½', price: '1000 ÐžÐš', profit: '1620 Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½ Ð·Ð° 90 Ð´Ð½ÐµÐ¹' },
  { title: 'Ð”Ð¾Ð³Ð¾Ð²Ð¾Ñ€ Ð½Ð° Ð¼ÐµÑÑÑ†', price: '250 ÐžÐš', profit: '270 Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½ Ð·Ð° 30 Ð´Ð½ÐµÐ¹' },
  { title: 'Ð”Ð¾Ð³Ð¾Ð²Ð¾Ñ€ Ð½Ð° 10 Ð´Ð½ÐµÐ¹', price: '100 ÐžÐš', profit: '60 Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½ Ð·Ð° 10 Ð´Ð½ÐµÐ¹' },
];
const TOWER_HALLS = [
  { id: 'skeletons', title: 'Ð—Ð°Ð» ÑÐºÐµÐ»ÐµÑ‚Ð¾Ð²', progress: 20, total: 20, completed: true, locked: false, image: 'scene-character' },
  { id: 'zombies', title: 'Ð—Ð°Ð» Ð·Ð¾Ð¼Ð±Ð¸', progress: 15, total: 20, completed: false, locked: false, image: 'scene-hub' },
  { id: 'mummies', title: 'Ð—Ð°Ð» Ð¼ÑƒÐ¼Ð¸Ð¹', progress: 10, total: 20, completed: false, locked: false, image: 'scene-tavern' },
  { id: 'ice', title: 'Ð›ÐµÐ´ÑÐ½Ð¾Ð¹ Ð·Ð°Ð»', progress: 10, total: 20, completed: false, locked: false, image: 'scene-map' },
  { id: 'east', title: 'Ð’Ð¾ÑÑ‚Ð¾Ñ‡Ð½Ñ‹Ð¹ Ð·Ð°Ð»', progress: 10, total: 20, completed: false, locked: false, image: 'scene-journal' },
  { id: 'death', title: 'Ð—Ð°Ð» ÑÐ¼ÐµÑ€Ñ‚Ð¸', progress: 0, total: 20, completed: false, locked: true, image: 'scene-combat' },
];
const JOURNAL_COPY: Record<MetaTab, Array<{ title: string; text: string }>> = {
  news: [
    { title: 'ÐÐ¾Ð²Ð¾ÑÑ‚Ð¸ Ð´Ð²Ð¾Ñ€Ð°', text: 'Ð¡Ð²ÐµÐ¶Ð¸Ðµ Ð³Ð¾Ñ€Ð¾Ð´ÑÐºÐ¸Ðµ Ð²ÐµÑÑ‚Ð¸, Ñ€ÐµÐ´ÐºÐ¸Ðµ Ð³Ð¾ÑÑ‚Ð¸ Ð¸ Ð¿ÐµÑ€ÐµÐ¼ÐµÐ½Ñ‹ Ð² Ð½Ð¾Ñ‡Ð½Ð¾Ð¼ Ñ€Ð°ÑÐ¿Ð¸ÑÐ°Ð½Ð¸Ð¸.' },
    { title: 'ÐÐ¾Ð²Ñ‹Ð¹ ÐºÐ°Ñ€Ð°Ð²Ð°Ð½', text: 'Ð¢Ð¾Ñ€Ð³Ð¾Ð²Ñ†Ñ‹ Ð¿Ñ€Ð¸Ð²ÐµÐ·Ð»Ð¸ Ð»Ñ‘Ð³ÐºÐ¾Ðµ ÑÐ½Ð°Ñ€ÑÐ¶ÐµÐ½Ð¸Ðµ Ð¸ Ð½Ð¾Ð²Ñ‹Ðµ Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð½Ñ‹Ðµ Ð´Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ñ‹.' },
  ],
  faq: [
    { title: 'ÐšÐ°Ðº Ñ€Ð°ÑÑ‚Ñ‘Ñ‚ ÑÐ½ÐµÑ€Ð³Ð¸Ñ', text: 'Ð—Ð°Ð¿Ð°Ñ ÑÐ½ÐµÑ€Ð³Ð¸Ð¸ Ð¾Ð±Ð½Ð¾Ð²Ð»ÑÐµÑ‚ÑÑ Ð² 04:00 Ð¸ Ð¿Ð¾Ð»Ð½Ð¾ÑÑ‚ÑŒÑŽ Ð²Ð¾ÑÑÑ‚Ð°Ð½Ð°Ð²Ð»Ð¸Ð²Ð°ÐµÑ‚ÑÑ Ð¿Ñ€Ð¸ Ð½Ð¾Ð²Ð¾Ð¼ ÑƒÑ€Ð¾Ð²Ð½Ðµ.' },
    { title: 'ÐšÐ°Ðº ÑÐºÐ¸Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ Ð¿Ñ€ÐµÐ´Ð¼ÐµÑ‚', text: 'ÐŸÐµÑ€ÐµÑ‚Ð°Ñ‰Ð¸Ñ‚Ðµ Ð²ÐµÑ‰ÑŒ Ð¸Ð· Ñ€ÑŽÐºÐ·Ð°ÐºÐ° Ð½Ð° Ð¿Ð¾Ð´Ñ…Ð¾Ð´ÑÑ‰Ð¸Ð¹ ÑÐ»Ð¾Ñ‚ Ð³ÐµÑ€Ð¾Ñ Ð¸Ð»Ð¸ Ð½Ð°Ð¶Ð¼Ð¸Ñ‚Ðµ Ð² ÐºÐ°Ñ€Ñ‚Ð¾Ñ‡ÐºÐµ Ð¿Ñ€ÐµÐ´Ð¼ÐµÑ‚Ð°.' },
  ],
  fanclub: [
    { title: 'Ð¤Ð°Ð½-ÐºÐ»ÑƒÐ±', text: 'Ð—Ð´ÐµÑÑŒ ÑÐ¾Ð±ÐµÑ€ÑƒÑ‚ÑÑ Ð¾Ð±Ñ‰Ð¸Ðµ Ð¿Ð¾Ð´Ð±Ð¾Ñ€ÐºÐ¸, Ð»ÑŽÐ±Ð¸Ð¼Ñ‹Ðµ Ð±Ð¸Ð»Ð´Ñ‹ Ð¸ ÐºÐ¾Ð»Ð»ÐµÐºÑ†Ð¸Ð¸ ÑÐºÑ€Ð¸Ð½ÑˆÐ¾Ñ‚Ð¾Ð².' },
    { title: 'Ð—Ð°Ð» Ð¿Ð¾Ñ‡Ñ‘Ñ‚Ð°', text: 'ÐžÑ‚Ð´ÐµÐ»ÑŒÐ½Ð°Ñ Ð»ÐµÐ½Ñ‚Ð° Ð´Ð»Ñ ÑÐ°Ð¼Ñ‹Ñ… Ð·Ð°Ð¼ÐµÑ‚Ð½Ñ‹Ñ… Ð¿Ð¾Ð±ÐµÐ´ Ð¸ Ð½ÐµÐ¾Ð±Ñ‹Ñ‡Ð½Ñ‹Ñ… Ð¾Ð±Ñ€Ð°Ð·Ð¾Ð² Ð³ÐµÑ€Ð¾Ñ.' },
  ],
  help: [
    { title: 'ÐŸÐ¾Ð¼Ð¾Ñ‰ÑŒ', text: 'Ð•ÑÐ»Ð¸ ÑÐºÑ€Ð°Ð½ Ð²ÐµÐ´Ñ‘Ñ‚ ÑÐµÐ±Ñ ÑÑ‚Ñ€Ð°Ð½Ð½Ð¾, Ð¼Ð¾Ð¶Ð½Ð¾ Ð·Ð°ÐºÑ€Ñ‹Ñ‚ÑŒ Ð¾ÐºÐ½Ð¾, Ð¾Ñ‚ÐºÑ€Ñ‹Ñ‚ÑŒ Ð²ÐºÐ»Ð°Ð´ÐºÑƒ Ð·Ð°Ð½Ð¾Ð²Ð¾ Ð¸ Ð¿Ñ€Ð¾Ð´Ð¾Ð»Ð¶Ð¸Ñ‚ÑŒ Ñ ÑÐ¾Ñ…Ñ€Ð°Ð½Ñ‘Ð½Ð½Ð¾Ð³Ð¾ Ð¼ÐµÑÑ‚Ð°.' },
    { title: 'ÐŸÐ¾Ð´ÑÐºÐ°Ð·ÐºÐ°', text: 'Ð¡Ð½Ð°Ñ‡Ð°Ð»Ð° ÑƒÑÐ¸Ð»Ð¸Ð²Ð°Ð¹Ñ‚Ðµ ÑÐºÐ¸Ð¿Ð¸Ñ€Ð¾Ð²ÐºÑƒ Ð¸ Ð¾ÑÐ½Ð¾Ð²Ð½Ñ‹Ðµ Ñ…Ð°Ñ€Ð°ÐºÑ‚ÐµÑ€Ð¸ÑÑ‚Ð¸ÐºÐ¸, Ð° Ð·Ð°Ñ‚ÐµÐ¼ Ñ‚Ñ€Ð°Ñ‚ÑŒÑ‚Ðµ Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½Ñ‹ Ð½Ð° ÑƒÑÐºÐ¾Ñ€ÐµÐ½Ð¸Ðµ.' },
  ],
};
const EXERCISE_BRIEFS: Record<
  string,
  { title: string; intro: string; objective: string; gold: number; experience: number }
> = {
  'courtyard-lanterns': {
    title: 'ÐžÑÐ¾Ð±Ð¾Ðµ ÑƒÐ¼ÐµÐ½Ð¸Ðµ',
    intro:
      'Ð¡Ð¿Ð¾Ñ€Ð¸Ð¼, Ñ‚Ñ‹ Ð¸ Ð¿ÑÑ‚Ð¸ Ð¼Ð¸Ð½ÑƒÑ‚ Ð½Ðµ ÑÐ¼Ð¾Ð¶ÐµÑˆÑŒ Ð¾Ñ‚Ñ€Ð°Ð±Ð¾Ñ‚Ð°Ñ‚ÑŒ Ð² Ð¼Ð¾ÐµÐ¹ Ñ‚Ð°Ð²ÐµÑ€Ð½Ðµ? Ð§Ñ‚Ð¾Ð±Ñ‹ Ñ€Ð°Ð·Ð»Ð¸Ð²Ð°Ñ‚ÑŒ ÑÐ»ÑŒ, Ñ‚Ñ€ÐµÐ±ÑƒÐµÑ‚ÑÑ Ð¼Ð½Ð¾Ð³Ð¾ Ð»Ð¾Ð²ÐºÐ¾ÑÑ‚Ð¸ Ð¸ ÑƒÐ¼ÐµÐ½Ð¸Ñ!',
    objective: 'Ð£Ð²ÐµÐ»Ð¸Ñ‡ÑŒ Ð»Ð¾Ð²ÐºÐ¾ÑÑ‚ÑŒ Ð½Ð° 5 ÐµÐ´Ð¸Ð½Ð¸Ñ†.',
    gold: 405,
    experience: 135,
  },
  'harbor-rumors': {
    title: 'Ð¨Ñ‘Ð¿Ð¾Ñ‚ Ñƒ Ð¿Ñ€Ð¸ÑÑ‚Ð°Ð½Ð¸',
    intro:
      'Ð Ñ‹Ð±Ð°ÐºÐ¸ ÑˆÐµÐ¿Ñ‡ÑƒÑ‚ Ð¾ Ð½ÐµÐ·Ð½Ð°ÐºÐ¾Ð¼Ñ†Ðµ Ñƒ Ð±ÐµÑ€ÐµÐ³Ð°. ÐŸÑ€Ð¸ÑÐ¼Ð¾Ñ‚Ñ€Ð¸ÑÑŒ Ðº Ð½ÐµÐ¼Ñƒ Ð¸ Ð½Ðµ ÑƒÐ¿ÑƒÑÑ‚Ð¸ Ð½Ð¸ Ð¾Ð´Ð½Ð¾Ð¹ Ð´ÐµÑ‚Ð°Ð»Ð¸ Ð² ÐµÐ³Ð¾ Ð¼Ð°Ñ€ÑˆÑ€ÑƒÑ‚Ðµ.',
    objective: 'ÐŸÐ¾Ð²Ñ‹ÑÑŒ Ð¸Ð½Ñ‚ÑƒÐ¸Ñ†Ð¸ÑŽ Ð½Ð° 4 ÐµÐ´Ð¸Ð½Ð¸Ñ†Ñ‹.',
    gold: 360,
    experience: 150,
  },
  'tower-whispers': {
    title: 'Ð­Ñ…Ð¾ Ð±Ð°ÑˆÐ½Ð¸',
    intro:
      'Ð¡Ð¼Ð¾Ñ‚Ñ€Ð¸Ñ‚ÐµÐ»Ð¸ Ð¿Ð¾Ð¼Ð½ÑÑ‚ ÐºÐ°Ð¶Ð´Ñ‹Ð¹ Ð·Ð°Ð¿ÐµÑ€Ñ‚Ñ‹Ð¹ Ð·Ð°Ð». Ð˜Ð¼ Ð½ÑƒÐ¶ÐµÐ½ Ñ‚Ð¾Ñ‚, ÐºÑ‚Ð¾ Ð²Ñ‹Ð´ÐµÑ€Ð¶Ð¸Ñ‚ Ñ…Ð¾Ð»Ð¾Ð´Ð½Ñ‹Ðµ ÐºÐ¾Ñ€Ð¸Ð´Ð¾Ñ€Ñ‹ Ð¸ Ð½Ðµ Ð¾Ñ‚Ð²ÐµÑ€Ð½Ñ‘Ñ‚ÑÑ Ð¾Ñ‚ Ñ‚ÐµÐ½ÐµÐ¹.',
    objective: 'ÐŸÐ¾Ð²Ñ‹ÑÑŒ ÑÐ¸Ð»Ñƒ Ð½Ð° 3 ÐµÐ´Ð¸Ð½Ð¸Ñ†Ñ‹.',
    gold: 450,
    experience: 180,
  },
};
const QUEST_HINTS: Record<string, string> = {
  'tavern-first-contract':
    'Ð˜Ð´Ð¸ Ð¿Ñ€ÑÐ¼Ð¾, Ð½Ð°Ð¿Ñ€Ð°Ð²Ð¾, Ð½Ð°Ð»ÐµÐ²Ð¾. Ð¢Ð¾Ð»ÑŒÐºÐ¾ Ð½Ðµ Ð·Ð°Ð±ÑƒÐ´ÑŒÑÑ Ð² Ð¿ÑƒÑ‚Ð¸ Ð¸ Ð¿Ð¾Ð¼Ð½Ð¸: Ð¾ÑÑ‚Ð¾Ñ€Ð¾Ð¶Ð½Ð¾ÑÑ‚ÑŒ ÑÐµÐ³Ð¾Ð´Ð½Ñ Ð²Ð°Ð¶Ð½ÐµÐµ ÑÐºÐ¾Ñ€Ð¾ÑÑ‚Ð¸.',
  'harbor-lantern':
    'Ð¡Ð¼Ð¾Ñ‚Ñ€Ð¸ Ð½Ð° Ð¾Ñ‚Ñ€Ð°Ð¶ÐµÐ½Ð¸Ñ Ð² Ð²Ð¾Ð´Ðµ, Ð° Ð½Ðµ Ð½Ð° ÑÐ°Ð¼ Ð¾Ð³Ð¾Ð½ÑŒ. Ð˜Ð½Ð¾Ð³Ð´Ð° ÑÐ»ÐµÐ´ Ð²Ð¸Ð´ÐµÐ½ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ ÑÐ±Ð¾ÐºÑƒ Ð¸ Ñ‚Ð¾Ð»ÑŒÐºÐ¾ Ñ Ð½ÑƒÐ¶Ð½Ð¾Ð³Ð¾ ÐºÐ°Ð¼Ð½Ñ.',
  'ash-baron-duel':
    'Ð’Ñ‹Ñ…Ð¾Ð´Ð¸ Ðº Ð°Ñ€ÐµÐ½Ðµ Ð±ÐµÐ· ÑÐ¿ÐµÑˆÐºÐ¸. Ð‘Ð°Ñ€Ð¾Ð½ Ð»ÑŽÐ±Ð¸Ñ‚ Ð´Ð¾Ð»Ð³Ð¸Ð¹ Ñ€Ð°Ð·Ð¾Ð³Ñ€ÐµÐ² Ð¸ Ñ‚ÐµÑ€ÑÐµÑ‚ Ñ€Ð¸Ñ‚Ð¼, ÐµÑÐ»Ð¸ ÐµÐ³Ð¾ Ð²ÑÑ‚Ñ€ÐµÑ‡Ð°ÑŽÑ‚ Ñ…Ð»Ð°Ð´Ð½Ð¾ÐºÑ€Ð¾Ð²Ð½Ð¾.',
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
          aria-label="Ð—Ð°ÐºÑ€Ñ‹Ñ‚ÑŒ"
          data-testid="world-window-close-button"
          onClick={onClose}
        >
          <UiIcon name="close" />
        </button>
      </header>
      <div className={`shell-reset-window-body lov-window-body body-scroll-${bodyScroll}`}>{children}</div>
      <footer className="shell-reset-window-footer lov-window-footer">
        <button className="lov-close-button" data-testid="world-window-bottom-close" onClick={onClose}>
          Ð—Ð°ÐºÑ€Ñ‹Ñ‚ÑŒ
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
      title="Ð¢Ð°Ð²ÐµÑ€Ð½Ð°"
      onClose={onClose}
      testId="tavern-window"
      className="lov-tavern-shell"
      size="hero"
      bodyScroll="sections"
    >
      <div className="lov-window-split lov-tavern-layout" data-testid="npc-dialog-screen">
        <section className="lov-illustration-panel lov-tavern-illustration">
          <img src={assetPath('scene-tavern')} alt="" />
          <div className="lov-speech-bubble tavernkeeper">ã‚·ãƒ–ã‚·ãƒ–</div>
          {activeQuest ? (
            <aside className="lov-quest-hover-card lov-tavern-preview-card" data-testid="task-popup">
              <h3>{activeQuest.titleRu}</h3>
              <p>{QUEST_HINTS[activeQuest.id] ?? activeQuest.descriptionRu}</p>
              <small>
                Ð¦ÐµÐ½Ð°: {activeQuest.energyCost} ÑÐ½ÐµÑ€Ð³Ð¸Ð¸ Â· ÐÐ°Ð³Ñ€Ð°Ð´Ð°: {activeQuest.reward.gold} Ð·Ð¾Ð»Ð¾Ñ‚Ð° Â·{' '}
                {activeQuest.reward.experience} XP
              </small>
            </aside>
          ) : null}
        </section>

        <section className="lov-tavern-right">
          {character ? (
            <div className="lov-energy-block">
              <Meter
                label="âš¡"
                value={character.energy}
                max={character.maxEnergy}
                tone="energy"
                displayValue={`${character.energy}`}
              />
              <p>Ð­Ð½ÐµÑ€Ð³Ð¸Ñ Ð¿Ð¾Ð¿Ð¾Ð»Ð½ÑÐµÑ‚ÑÑ Ñ€Ð°Ð· Ð² ÑÑƒÑ‚ÐºÐ¸</p>
              <p>ÐšÑ€ÑƒÐ¶ÐºÐ° ÑÐ»Ñ Ð¿Ð¾Ð¿Ð¾Ð»Ð½Ð¸Ñ‚ ÐµÑ‘ Ð¼Ð³Ð½Ð¾Ð²ÐµÐ½Ð½Ð¾</p>
              <div className="lov-energy-buy-row">
                <button
                  type="button"
                  className="lov-energy-button"
                  disabled={busy || character.energy >= character.maxEnergy || character.gems < 1}
                  onClick={() => onIntent({ type: 'refillEnergy', mode: 'cup' })}
                >
                  <strong>+5</strong>
                  <span>1 Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½Ð°</span>
                </button>
                <button
                  type="button"
                  className="lov-energy-button"
                  disabled={busy || character.energy >= character.maxEnergy || character.gems < 5}
                  onClick={() => onIntent({ type: 'refillEnergy', mode: 'bundle' })}
                >
                  <strong>+25</strong>
                  <span>5 Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½</span>
                </button>
              </div>
            </div>
          ) : null}

          <div className="lov-tavern-copy">
            <p>Ð¡Ñ‚Ñ€Ð°Ð½Ð½Ð¸ÐºÑƒ Ð ÐµÑŽ Ð½ÑƒÐ¶Ð½Ð° Ð¿Ð¾Ð¼Ð¾Ñ‰ÑŒ,</p>
            <p>Ð¾Ð±Ñ‹Ñ‡Ð½Ð¾ Ð¾Ð½ Ñ‰ÐµÐ´Ñ€Ð¾ Ð·Ð° Ð½ÐµÑ‘ Ð¿Ð»Ð°Ñ‚Ð¸Ñ‚</p>
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
                    <span>{quest.energyCost} âš¡</span>
                  </div>
                  <div className="lov-quest-row-reward">
                    <span>Ð¢Ð²Ð¾Ñ Ð½Ð°Ð³Ñ€Ð°Ð´Ð°:</span>
                    <strong>{quest.reward.gold}</strong>
                    <span>Ð·Ð¾Ð»Ð¾Ñ‚Ð°</span>
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
    { icon: 'â¤', value: enemy.health },
    { icon: 'ðŸ›¡', value: enemy.armor },
    { icon: 'ATK', value: enemy.stats[STAT_STRENGTH] },
    { icon: 'DEX', value: enemy.stats[STAT_AGILITY] },
    { icon: 'INT', value: enemy.stats[STAT_INTUITION] },
    { icon: 'LCK', value: enemy.stats[STAT_LUCK] },
  ];

  return (
    <WorldWindowShell
      title="ÐÑ€ÐµÐ½Ð°"
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
            <span>{enemy.level} ÑƒÑ€Ð¾Ð²ÐµÐ½ÑŒ</span>
          </div>
          <div className="lov-arena-grid">
            {stats.map((entry) => (
              <div key={`${entry.icon}-${entry.value}`} className="lov-arena-stat">
                <span>{entry.icon}</span>
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
              Ð¡Ð¼ÐµÐ½Ð¸Ñ‚ÑŒ ÑÐ¾Ð¿ÐµÑ€Ð½Ð¸ÐºÐ°
            </button>
            <button
              type="button"
              className="lov-danger-button"
              data-testid="arena-start-button"
              onClick={() => onIntent({ type: 'startArena', enemyId: enemy.id })}
            >
              ÐÐ°Ñ‡Ð°Ñ‚ÑŒ Ð±Ð¾Ð¹!
            </button>
          </div>
        </section>

        <section className="lov-arena-preview">
          <img src={assetPath('enemy-ash-baron')} alt="" />
        </section>
      </div>

      <div className="lov-arena-toggles">
        <button type="button" className="lov-toggle-chip disabled" disabled>
          ÐÐ²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¸Ð¹ Ð±Ð¾Ð¹
        </button>
        <button type="button" className="lov-toggle-chip disabled" disabled>
          Ð’Ñ‹Ð·Ñ‹Ð²Ð°Ñ‚ÑŒ Ð¿Ð¸Ñ‚Ð¾Ð¼Ñ†Ð°
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
      title="ÐœÐ°Ð³Ð°Ð·Ð¸Ð½"
      onClose={onClose}
      testId="store-sheet"
      className={`lov-store-shell tab-${tab}`}
      size="hero"
      bodyScroll="sections"
    >
      <div className="lov-store-tabs">
        <button type="button" className={tab === 'shop' ? 'active' : ''} onClick={() => setTab('shop')}>
          ÐœÐ°Ð³Ð°Ð·Ð¸Ð½
        </button>
        <button type="button" className={tab === 'work' ? 'active' : ''} onClick={() => setTab('work')}>
          Ð Ð°Ð±Ð¾Ñ‚Ð°
        </button>
        <button type="button" className={tab === 'contracts' ? 'active' : ''} onClick={() => setTab('contracts')}>
          Ð”Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ñ‹
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
            <h3>Ð ÑŽÐºÐ·Ð°Ðº</h3>
            <InventoryGrid
              state={state}
              stacks={backpack}
              selectedStackId={selectedItemStackId}
              onSelect={(inventoryStackId) => onIntent({ type: 'openItemInfo', inventoryStackId })}
              dataTestId="inventory-panel"
              fillSlots={24}
            />
          </section>

          <section className="lov-merchant-panel">
            <div className="lov-store-scene-card">
              <div className="lov-merchant-illustration">
                <img src={assetPath('scene-hub')} alt="" />
                <div className="lov-speech-bubble merchant">ã‚·ãƒ–ã‚·ãƒ–</div>
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
              <strong>Ð¢Ð¾Ð²Ð°Ñ€Ñ‹ Ð»Ð°Ð²ÐºÐ¸</strong>
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
                  </button>
                ))}
              </div>
            </div>
            <button type="button" className="lov-refresh-button secondary" disabled>
              ÐžÐ±Ð½Ð¾Ð²Ð¸Ñ‚ÑŒ Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½ Â· 1 Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½Ð°
            </button>
          </section>
        </div>
      ) : null}

      {tab === 'work' ? (
        <div className="lov-work-layout">
          <div className="lov-work-banner">
            <p>Ð¢Ð²Ð¾Ñ Ð·Ð°Ñ€Ð¿Ð»Ð°Ñ‚Ð° Ð·Ð°Ð²Ð¸ÑÐ¸Ñ‚ Ð¾Ñ‚ ÐºÐ¾Ð»Ð¸Ñ‡ÐµÑÑ‚Ð²Ð° Ð´Ñ€ÑƒÐ·ÐµÐ¹-Ð¿Ð¾Ð¼Ð¾Ñ‰Ð½Ð¸ÐºÐ¾Ð²</p>
            <div className="lov-bonus-strip">
              {['Ã—1', 'Ã—2', 'Ã—3', 'Ã—4', 'Ã—5', 'Ã—6'].map((label) => (
                <span key={label}>{label}</span>
              ))}
              <strong>Ð¢ÐµÐºÑƒÑ‰Ð¸Ð¹ Ð±Ð¾Ð½ÑƒÑ Ã—7</strong>
            </div>
            <div className="lov-friends-bonus">Ð”Ñ€ÑƒÐ·ÐµÐ¹: 762</div>
          </div>
          <div className="lov-work-main">
            <div className="lov-work-illustration">
              <img src={assetPath('scene-hub')} alt="" />
            </div>
            <div className="lov-work-card">
              <h3>ÐŸÑ€Ð¸ÑÐ¼Ð¾Ñ‚Ñ€ÐµÑ‚ÑŒ Ð·Ð° Ð¼Ð°Ð³Ð°Ð·Ð¸Ð½Ð¾Ð¼</h3>
              <p>Ð¢Ð²Ð¾Ñ Ð·Ð°Ñ€Ð¿Ð»Ð°Ñ‚Ð°:</p>
              <strong>3024 Ð·Ð¾Ð»Ð¾Ñ‚Ð°</strong>
              <div className="lov-progress-card">
                <span>Ð”Ð¾ Ð¾ÐºÐ¾Ð½Ñ‡Ð°Ð½Ð¸Ñ Ñ€Ð°Ð±Ð¾Ñ‚Ñ‹:</span>
                <Meter label="âŒ›" value={45165} max={90000} tone="xp" displayValue="07:32:45" />
              </div>
              <button type="button" className="lov-danger-button" disabled>
                ÐŸÑ€ÐµÑ€Ð²Ð°Ñ‚ÑŒ Ñ€Ð°Ð±Ð¾Ñ‚Ñƒ
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'contracts' ? (
        <div className="lov-contracts-layout">
          <h3>Ð—Ð°Ñ…Ð¾Ð´Ð¸ Ð² Ð¸Ð³Ñ€Ñƒ ÐºÐ°Ð¶Ð´Ñ‹Ð¹ Ð´ÐµÐ½ÑŒ Ð¸ Ð¿Ð¾Ð»ÑƒÑ‡Ð°Ð¹ Ð¶ÐµÐ¼Ñ‡ÑƒÐ³!</h3>
          <div className="lov-contract-list">
            {STORE_CONTRACTS.map((contract) => (
              <article key={contract.title} className="lov-contract-card">
                <div className="lov-contract-top">
                  <strong>{contract.title}</strong>
                  <span>{contract.price}</span>
                </div>
                <div className="lov-contract-bottom">
                  <span>Ð¢Ð²Ð¾Ñ Ð¿Ñ€Ð¸Ð±Ñ‹Ð»ÑŒ:</span>
                  <strong>{contract.profit}</strong>
                </div>
              </article>
            ))}
          </div>
          <p>Ð”Ñ€ÑƒÐ³ Ð¼Ð¾Ð¹! Ð¡Ð´ÐµÐ»Ð°Ð¹ Ð²ÐºÐ»Ð°Ð´ Ð² Ð¼Ð¾Ñ‘ Ð´ÐµÐ»Ð¾ Ð¸ Ð¿Ð¾Ð»ÑƒÑ‡Ð°Ð¹ Ð¿Ñ€Ð¸Ð±Ñ‹Ð»ÑŒ ÐºÐ°Ð¶Ð´Ñ‹Ð¹ Ð´ÐµÐ½ÑŒ!</p>
        </div>
      ) : null}
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
      getBackpackStacks(state).filter((stack) => {
        const item = state.items.find((entry) => entry.id === stack.itemId);
        return Boolean(item?.forgeable);
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
      title="ÐšÑƒÐ·Ð½Ð¸Ñ†Ð°"
      onClose={onClose}
      testId="forge-window"
      className="lov-forge-shell"
      size="hero"
      bodyScroll="sections"
    >
      <div className="lov-store-layout">
        <section className="lov-bag-panel">
          <h3>Ð ÑŽÐºÐ·Ð°Ðº</h3>
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
          <div className="lov-forge-illustration">
            <img src={assetPath('scene-hub')} alt="" />
            <div className="lov-speech-bubble forge">ãƒšãƒãƒ£ã‚¯ãƒãƒ£</div>
          </div>

          <div
            className={`lov-anvil-slot ${selectedItem ? 'filled' : ''}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              const inventoryStackId = readDraggedStackId(event);
              if (inventoryStackId) {
                onIntent({ type: 'selectForgeItem', inventoryStackId });
              }
            }}
          >
            {selectedItem ? <ItemChip item={selectedItem} /> : <span>ÐŸÐµÑ€ÐµÑ‚Ð°Ñ‰Ð¸ Ð¿Ñ€ÐµÐ´Ð¼ÐµÑ‚ Ð½Ð° Ð½Ð°ÐºÐ¾Ð²Ð°Ð»ÑŒÐ½ÑŽ</span>}
          </div>

          <button
            type="button"
            disabled={!activeForgeStack}
            onClick={() => activeForgeStack && onIntent({ type: 'upgradeItem', inventoryStackId: activeForgeStack.id })}
          >
            {'\u0423\u043b\u0443\u0447\u0448\u0438\u0442\u044c'}
          </button>

          <div className="lov-forge-instruction">
            {selectedItem ? (
              <>
                <strong>{selectedItem.nameRu}</strong>
                <span>Ð¡Ñ‚Ð¾Ð¸Ð¼Ð¾ÑÑ‚ÑŒ: {upgradeCost} Ð·Ð¾Ð»Ð¾Ñ‚Ð°</span>
                <span>Ð¢ÐµÐºÑƒÑ‰Ð¸Ð¹ ÑƒÑ€Ð¾Ð²ÐµÐ½ÑŒ: +{activeForgeStack?.enhancementLevel ?? 0}</span>
              </>
            ) : (
              <>
                <strong>ÐŸÐµÑ€ÐµÑ‚Ð°Ñ‰Ð¸ Ð¿Ñ€ÐµÐ´Ð¼ÐµÑ‚</strong>
                <span>Ð½Ð° Ð½Ð°ÐºÐ¾Ð²Ð°Ð»ÑŒÐ½ÑŽ</span>
              </>
            )}
          </div>
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
      title="Ð¢ÐµÐ¼Ð½Ð°Ñ Ð±Ð°ÑˆÐ½Ñ"
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
                {hall.completed ? <span className="lov-tower-mark">âœ“</span> : null}
                {locked ? <span className="lov-tower-lock">ðŸ”’</span> : null}
              </div>
              {locked ? (
                <div className="lov-tower-progress locked">ÐÑƒÐ¶ÐµÐ½ ÐºÐ»ÑŽÑ‡!</div>
              ) : (
                <div className="lov-tower-progress">
                  <i style={{ width: `${percent}%` }} />
                  <span>ÐŸÑ€Ð¾Ð¹Ð´ÐµÐ½Ð¾: {hall.progress}/{hall.total}</span>
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
      title="Ð›Ð¾Ð´Ð¾Ñ‡Ð½Ð¸Ðº"
      onClose={onClose}
      testId="boatman-window"
      className="lov-boatman-shell"
      size="standard"
      bodyScroll="none"
    >
      <div className="lov-window-split lov-boatman-layout">
        <section className="lov-illustration-panel lov-boatman-illustration">
          <img src={assetPath('scene-map')} alt="" />
          <div className="lov-speech-bubble boatman">ãƒ›ã‚³ãƒ›ã‚³</div>
          <button type="button" className="lov-dice-button secondary" disabled>
            Ð¡Ñ‹Ð³Ñ€Ð°Ñ‚ÑŒ Ð² ÐºÐ¾ÑÑ‚Ð¸
          </button>
        </section>
        <section className="lov-window-copy lov-boatman-copy">
          <p className="lov-boatman-lead">Ð¡Ñ‚Ð°Ñ€Ð¸Ðº Ð¢Ð¾Ñ€Ñƒ Ð¾Ñ‚Ð²ÐµÐ·Ñ‘Ñ‚ Ñ‚ÐµÐ±Ñ Ñ…Ð¾Ñ‚ÑŒ Ð½Ð° ÐºÑ€Ð°Ð¹ ÑÐ²ÐµÑ‚Ð°</p>
          <div className="lov-boatman-card">
            <button type="button" disabled>
              ÐžÑÑ‚Ñ€Ð¾Ð² Ð£Ð¶Ð°ÑÐ° Â· 1 Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½Ð°
            </button>
            <small>ÐÐ¾Ð²Ñ‹Ðµ Ð·ÐµÐ¼Ð»Ð¸ Ð¶Ð´ÑƒÑ‚ Ñ‚ÐµÐ±Ñ!</small>
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
      title="Ð¤Ð¾Ð½Ñ‚Ð°Ð½"
      onClose={onClose}
      testId="fountain-window"
      className="lov-fountain-shell"
      size="standard"
      bodyScroll="none"
    >
      <div className="lov-fountain-layout">
        <div className="lov-fountain-rules">
          ÐšÐ°Ð¶Ð´Ñ‹Ð¹ Ñ€Ð°Ð·, ÐºÐ¾Ð³Ð´Ð° Ñ‚Ñ‹ Ð±Ñ€Ð¾ÑÐ°ÐµÑˆÑŒ Ð² Ñ„Ð¾Ð½Ñ‚Ð°Ð½ Ð³Ð¾Ñ€ÑÑ‚ÑŒ Ð¼Ð¾Ð½ÐµÑ‚, Ñƒ Ñ‚ÐµÐ±Ñ ÐµÑÑ‚ÑŒ ÑˆÐ°Ð½Ñ Ð¿Ð¾Ð»ÑƒÑ‡Ð¸Ñ‚ÑŒ Ð°ÑƒÑ€Ñƒ. Ð¢Ð° Ñ€Ð°ÑÐ°, Ñ‡Ñ‚Ð¾ Ð¿Ð¾Ð¶ÐµÑ€Ñ‚Ð²ÑƒÐµÑ‚
          Ð±Ð¾Ð»ÑŒÑˆÐµ Ð·Ð¾Ð»Ð¾Ñ‚Ð° Ð”ÑƒÑ…Ñƒ Ñ„Ð¾Ð½Ñ‚Ð°Ð½Ð° ÑÐµÐ³Ð¾Ð´Ð½Ñ, Ð±ÑƒÐ´ÐµÑ‚ Ð½Ð°Ð³Ñ€Ð°Ð¶Ð´ÐµÐ½Ð° Ð¾ÑÐ¾Ð±Ð¾Ð¹ Ð°ÑƒÑ€Ð¾Ð¹ Ð½Ð° ÑÐ»ÐµÐ´ÑƒÑŽÑ‰Ð¸Ð¹ Ð´ÐµÐ½ÑŒ.
        </div>
        <div className="lov-fountain-main">
          <div className="lov-fountain-glow" />
          <h3>Ð¡ÐµÐ³Ð¾Ð´Ð½Ñ Ð”ÑƒÑ… Ñ„Ð¾Ð½Ñ‚Ð°Ð½Ð° Ð±Ð»Ð°Ð³Ð¾Ð²Ð¾Ð»Ð¸Ñ‚ Ð’Ð°Ð¼Ð¿Ð¸Ñ€Ð°Ð¼</h3>
          <p>Ð‘Ñ€Ð¾ÑÑŒ Ð³Ð¾Ñ€ÑÑ‚ÑŒ Ð¼Ð¾Ð½ÐµÑ‚, Ñ‡Ñ‚Ð¾Ð±Ñ‹ Ð¿Ð¾Ð»ÑƒÑ‡Ð¸Ñ‚ÑŒ ÐºÐ°Ð¿Ð»Ð¸ ÐºÑ€Ð¾Ð²Ð¸</p>
          <div className="lov-fountain-timer">
            <span>Ð‘Ð»Ð°Ð³Ð¾ÑÐ»Ð¾Ð²ÐµÐ½Ð¸Ðµ Ñ€Ð°ÑÑÐµÐµÑ‚ÑÑ Ñ‡ÐµÑ€ÐµÐ·:</span>
            <strong>00:07:59</strong>
          </div>
          <button type="button" className="lov-donation-button" disabled>
            Ð‘Ñ€Ð¾ÑÐ¸Ñ‚ÑŒ Ð³Ð¾Ñ€ÑÑ‚ÑŒ Ð¼Ð¾Ð½ÐµÑ‚ Â· 1350 Ð·Ð¾Ð»Ð¾Ñ‚Ð°
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
      title="ÐÐ¾Ð²Ð¾Ðµ Ð·Ð°Ð´Ð°Ð½Ð¸Ðµ"
      onClose={onClose}
      testId="exercise-detail-window"
      className="lov-quest-shell"
      size="compact"
      bodyScroll="none"
    >
      <div className="lov-window-split lov-quest-layout">
        <section className="lov-illustration-panel lov-quest-illustration">
          <img src={assetPath('scene-tavern')} alt="" />
          <div className="lov-speech-bubble tavernkeeper">ã‚¯ãƒ‰ã‚¯ãƒ‰</div>
        </section>
        <section className="lov-window-copy lov-quest-copy">
          <h3>{brief.title}</h3>
          <p>{brief.intro}</p>
          <div className="lov-quest-objective">
            <span>Ð—Ð°Ð´Ð°Ð½Ð¸Ðµ:</span>
            <strong>{brief.objective}</strong>
          </div>
          <div className="lov-quest-objective">
            <span>Ð¢Ñ‹ Ð¿Ð¾Ð»ÑƒÑ‡Ð¸ÑˆÑŒ:</span>
            <strong>
              {brief.gold} Ð·Ð¾Ð»Ð¾Ñ‚Ð° Â· {brief.experience} XP
            </strong>
          </div>
        </section>
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
      title="ÐšÐ¾Ð»Ð»ÐµÐºÑ†Ð¸Ð¸ Ð¸ Ð¿Ð¾Ð¼Ð¾Ñ‰ÑŒ"
      onClose={onClose}
      testId="settings-window"
      size="standard"
      bodyScroll="body"
    >
      <div className="lov-journal-cards">
        <article className="lov-journal-card">
          <h3>ÐšÐ¾Ð»Ð»ÐµÐºÑ†Ð¸Ð¸</h3>
          <p>Ð ÐµÐ´ÐºÐ¸Ðµ Ð½Ð°Ñ…Ð¾Ð´ÐºÐ¸, Ð½Ð°Ð±Ð¾Ñ€Ñ‹ Ð¸ Ð¿Ð¾Ð´Ð°Ñ€ÐºÐ¸ Ð¾ÑÑ‚Ð°Ð½ÑƒÑ‚ÑÑ Ð·Ð´ÐµÑÑŒ Ð¾Ñ‚Ð´ÐµÐ»ÑŒÐ½Ñ‹Ð¼Ð¸ Ñ€Ð°Ð·Ð´ÐµÐ»Ð°Ð¼Ð¸.</p>
        </article>
        <article className="lov-journal-card">
          <h3>ÐÐ°ÑÑ‚Ñ€Ð¾Ð¹ÐºÐ¸</h3>
          <p>Ð—Ð²ÑƒÐº, ÑÑ„Ñ„ÐµÐºÑ‚Ñ‹ Ð¸ Ð³Ñ€Ð°Ñ„Ð¸Ñ‡ÐµÑÐºÐ¾Ðµ ÐºÐ°Ñ‡ÐµÑÑ‚Ð²Ð¾ Ð¼Ð¾Ð¶Ð½Ð¾ Ð±ÑƒÐ´ÐµÑ‚ Ð·Ð°ÐºÑ€ÐµÐ¿Ð¸Ñ‚ÑŒ Ð² ÑÑ‚Ð¾Ð¼ Ð¶Ðµ Ð¾ÐºÐ½Ðµ.</p>
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
        <div className="lov-travel-sidecard">0/5</div>
        <div className="lov-travel-sidecard">0/1</div>
      </aside>

      <div className="lov-travel-pin">
        <img src={assetPath('hero-nocturne')} alt="" />
      </div>

      <section className="lov-travel-story">
        <div className="lov-travel-portrait">
          <img src={assetPath('hero-nocturne')} alt="" />
        </div>
        <div className="lov-travel-story-copy">
          <p>Â«Ð—Ð°Ñ‡ÐµÐ¼ Ð¡Ð¾Ð»Ð½Ñ†Ðµ Ð¿Ð¾Ð´Ð°Ñ€Ð¸Ð»Ð¾ Ð¼Ð½Ðµ Ð¾Ð¶ÐµÑ€ÐµÐ»ÑŒÐµ? Ð’ÐµÐ´ÑŒ Ñ Ð½Ðµ ÑÐ¼Ð¾Ð³Ð»Ð° ÑÐ±ÐµÑ€ÐµÑ‡ÑŒ ÐµÐ³Ð¾. Ð Ñ‚ÐµÐ¿ÐµÑ€ÑŒ Ñ‡Ñ‚Ð¾? Ð˜ Ñ‡Ñ‚Ð¾ Ð±ÑƒÐ´ÐµÑ‚ Ð´Ð°Ð»ÑŒÑˆÐµ?Â»</p>
          {activeTravelReady && activeTravel ? (
            <button type="button" onClick={() => onIntent({ type: 'claimTravel', travelId: activeTravel.id })}>
              Ð¯ ÑƒÑ‡Ñ‚Ñƒ ÑÑ‚Ð¾
            </button>
          ) : (
            <button type="button" disabled>
              Ð¯ ÑƒÑ‡Ñ‚Ñƒ ÑÑ‚Ð¾
            </button>
          )}
        </div>
      </section>

      <div className="lov-travel-bottom">
        <div className="shell-reset-travel-progress lov-travel-progress">
          <span style={{ width: `${progress?.percent ?? 0}%` }} />
        </div>
        <strong>{progress ? formatDuration(progress.secondsLeft) : '00:01:50'}</strong>
        <button type="button" className="lov-skip-button" disabled>
          ÐÐµ Ñ…Ð¾Ñ‡Ñƒ Ð¶Ð´Ð°Ñ‚ÑŒ! Â· 1 Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½Ð°
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
  character,
  enemy,
  characterHealth,
  characterMaxHealth,
  enemyHealth,
  enemyMaxHealth,
  petAssistArmed,
  replayTurns,
  onIntent,
}: {
  character: BootstrapState['character'];
  enemy: EnemyDefinition | undefined;
  characterHealth: number;
  characterMaxHealth: number;
  enemyHealth: number;
  enemyMaxHealth: number;
  petAssistArmed: boolean;
  replayTurns: CombatTurn[] | undefined;
  onIntent: (intent: GameIntent) => void;
}) {
  if (!character || !enemy) {
    return null;
  }

  const recentTurns = replayTurns?.slice(-2) ?? [];

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
            aria-label="Ð¡Ð²ÐµÐ´ÐµÐ½Ð¸Ñ Ð¾ Ð³ÐµÑ€Ð¾Ðµ"
            onClick={() => onIntent({ type: 'openInfo', windowId: 'heroInfo' })}
          >
            <UiIcon name="info" />
          </button>
          <div className="lov-combat-avatar">
            <img src={assetPath('hero-nocturne')} alt="" />
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
          ÐŸÑ€Ð¾Ð¿ÑƒÑÑ‚Ð¸Ñ‚ÑŒ Ð±Ð¾Ð¹
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
            aria-label="Ð¡Ð²ÐµÐ´ÐµÐ½Ð¸Ñ Ð¾ Ð¿Ñ€Ð¾Ñ‚Ð¸Ð²Ð½Ð¸ÐºÐµ"
            onClick={() => onIntent({ type: 'openInfo', windowId: 'enemyInfo' })}
          >
            <UiIcon name="info" />
          </button>
        </div>
      </div>

      <div className="lov-battle-stage">
        <img className="lov-fighter hero" src={assetPath('hero-nocturne')} alt="" />
        <img className="lov-fighter enemy" src={assetPath('enemy-ash-baron')} alt="" />
      </div>

      <div className="lov-battle-bottom">
        <div className="lov-pet-card">
          <button
            type="button"
            className={`lov-toggle-chip ${petAssistArmed ? 'active' : ''}`}
            data-testid="pet-assist-button"
            onClick={() => onIntent({ type: 'togglePetAssist' })}
          >
            Ð’Ñ‹Ð·Ñ‹Ð²Ð°Ñ‚ÑŒ Ð¿Ð¸Ñ‚Ð¾Ð¼Ñ†Ð°
          </button>
          <div className="lov-pet-card-body">
            <div className="lov-pet-card-image">
              <img src={assetPath('pet-wyvern')} alt="" />
            </div>
            <div className="lov-pet-card-copy">
              <strong>ÐšÐ¾Ñ‚Ñ‘Ð½Ð¾Ðº</strong>
              <span>17 ÑƒÑ€Ð¾Ð²ÐµÐ½ÑŒ</span>
              <div className="lov-health-track">
                <i style={{ width: '100%' }} />
              </div>
              <small>2100</small>
            </div>
          </div>
        </div>
      </div>

      {recentTurns.length ? (
        <div className="shell-reset-damage-layer" aria-hidden="true">
          {recentTurns.map((turn: CombatTurn, index: number) => (
            <span
              key={`${turn.turn}-${turn.actor}-${turn.damage}-${index}`}
              className={`shell-reset-damage ${turn.actor === 'character' ? 'to-enemy' : 'to-hero'} ${turn.critical ? 'critical' : ''}`}
              style={{ '--float-index': `${index}` } as CSSProperties}
            >
              -{turn.damage}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function RewardWindow({
  latestResolvedCombat,
  onContinue,
}: {
  latestResolvedCombat: CombatEncounter | undefined;
  onContinue: () => void;
}) {
  const reward = latestResolvedCombat?.log?.reward;

  return (
    <section className="lov-victory-window" data-testid="reward-screen">
      <div className="lov-victory-left">
        <img src={assetPath('hero-nocturne')} alt="" />
      </div>
      <div className="lov-victory-right">
        <h2>ÐŸÐ¾Ð±ÐµÐ´Ð°!</h2>
        <p>Ð¢ÐµÐ¿ÐµÑ€ÑŒ Ñ‚Ñ‹ Ð¼Ð¾Ð¶ÐµÑˆÑŒ Ð³Ð¾Ñ€Ð´Ð¸Ñ‚ÑŒÑÑ ÑÐ¾Ð±Ð¾Ð¹!</p>
        <span>Ð¢Ð²Ð¾Ñ Ð½Ð°Ð³Ñ€Ð°Ð´Ð°:</span>
        <div className="lov-victory-rewards">
          <strong>{reward?.gold ?? 0} Ð·Ð¾Ð»Ð¾Ñ‚Ð°</strong>
          <strong>{reward?.experience ?? 0} XP</strong>
        </div>
        <div className="lov-reward-drop" aria-hidden="true" />
        <div className="lov-pet-xp">
          <img src={assetPath('pet-wyvern')} alt="" />
          <strong>1 XP</strong>
        </div>
        <button type="button" data-testid="reward-continue-button" onClick={onContinue}>
          Ð—Ð°ÐºÑ€Ñ‹Ñ‚ÑŒ
        </button>
      </div>
    </section>
  );
}

export function CharacterSheet({
  state,
  activeTab,
  selectedItemStackId,
  onIntent,
}: {
  state: BootstrapState;
  activeTab: SheetTab;
  selectedItemStackId: string | null;
  onIntent: (intent: GameIntent) => void;
}) {
  const character = state.character;
  const [hoveredStat, setHoveredStat] = useState<StatKey | null>(null);
  const [selectedPetId, setSelectedPetId] = useState(PET_VARIANTS[2]!.id);
  const [petSatiety, setPetSatiety] = useState(16);
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
  const backpack = getBackpackStacks(state);
  const totals = buildCharacterTotals(state, equippedEntries);
  const breakdowns = buildStatBreakdowns(state, race, equippedEntries);
  const selectedPet = PET_VARIANTS.find((entry) => entry.id === selectedPetId) ?? PET_VARIANTS[2]!;

  return (
    <section
      className="shell-reset-sheet lov-sheet"
      data-testid={
        activeTab === 'pets' ? 'pet-sheet' : activeTab === 'inventory' ? 'inventory-sheet' : activeTab === 'profile' ? 'profile-sheet' : activeTab === 'appearance' ? 'appearance-sheet' : 'character-sheet'
      }
    >
      <button
        type="button"
        className="lov-sheet-close"
        data-testid="sheet-close-button"
        aria-label="Ð—Ð°ÐºÑ€Ñ‹Ñ‚ÑŒ Ð¾ÐºÐ½Ð¾ Ð³ÐµÑ€Ð¾Ñ"
        onClick={() => onIntent({ type: 'closeSheet' })}
      >
        <UiIcon name="close" />
      </button>
      <aside className="shell-reset-sheet-rail lov-sheet-rail">
        <button type="button" className={activeTab === 'inventory' ? 'active' : ''} data-testid="character-tab-equipment" onClick={() => onIntent({ type: 'setSheetTab', tab: 'inventory' })}>
          Ð¡ÑƒÐ¼ÐºÐ°
        </button>
        <button type="button" className={activeTab === 'character' ? 'active' : ''} data-testid="character-tab-stats" onClick={() => onIntent({ type: 'setSheetTab', tab: 'character' })}>
          Ð¥Ð°Ñ€Ð°ÐºÑ‚ÐµÑ€Ð¸ÑÑ‚Ð¸ÐºÐ¸
        </button>
        <button type="button" className={activeTab === 'achievements' ? 'active' : ''} data-testid="character-tab-achievements" onClick={() => onIntent({ type: 'setSheetTab', tab: 'achievements' })}>
          Ð”Ð¾ÑÑ‚Ð¸Ð¶ÐµÐ½Ð¸Ñ
        </button>
        <button type="button" className={activeTab === 'pets' ? 'active' : ''} data-testid="character-tab-pets" onClick={() => onIntent({ type: 'setSheetTab', tab: 'pets' })}>
          ÐŸÐ¸Ñ‚Ð¾Ð¼Ñ†Ñ‹
        </button>
        <button type="button" className={activeTab === 'profile' ? 'active' : ''} data-testid="character-tab-profile" onClick={() => onIntent({ type: 'setSheetTab', tab: 'profile' })}>
          Ðž Ð³ÐµÑ€Ð¾Ðµ
        </button>
        <button type="button" className={activeTab === 'appearance' ? 'active' : ''} data-testid="character-tab-appearance" onClick={() => onIntent({ type: 'setSheetTab', tab: 'appearance' })}>
          Ð’Ð½ÐµÑˆÐ½Ð¾ÑÑ‚ÑŒ
        </button>
        <button type="button" className="back" data-testid="sheet-back-button" onClick={() => onIntent({ type: 'closeSheet' })}>
          <UiIcon name="back" />
        </button>
      </aside>

      <section className={`shell-reset-sheet-left lov-sheet-left tab-${activeTab}`}>
        {activeTab === 'character' ? (
          <div className="lov-stats-panel">
            <header className="lov-panel-header">
              <h2>Ð¥Ð°Ñ€Ð°ÐºÑ‚ÐµÑ€Ð¸ÑÑ‚Ð¸ÐºÐ¸</h2>
            </header>

            <div className="lov-core-stat">
              <div className="lov-core-stat-icon">â¤</div>
              <div className="lov-core-stat-body">
                <strong>Ð—Ð´Ð¾Ñ€Ð¾Ð²ÑŒÐµ</strong>
                <span>{character.maxHealth}</span>
              </div>
            </div>

            <div className="lov-core-stat">
              <div className="lov-core-stat-icon">ðŸ›¡</div>
              <div className="lov-core-stat-body">
                <strong>Ð‘Ñ€Ð¾Ð½Ñ</strong>
                <span>{totals.armor}</span>
              </div>
            </div>

            {PRIMARY_STATS.map((stat) => {
              const row = breakdowns[stat];
              return (
                <div
                  key={stat}
                  className="lov-stat-group"
                  onMouseEnter={() => setHoveredStat(stat)}
                  onMouseLeave={() => setHoveredStat((current) => (current === stat ? null : current))}
                >
                  <button
                    type="button"
                    className="lov-primary-stat"
                    onClick={() => character.unspentStatPoints > 0 && onIntent({ type: 'allocateStat', stat })}
                    disabled={character.unspentStatPoints < 1}
                  >
                    <div className="lov-primary-stat-main">
                      <span>{statTitle(stat)}</span>
                      <strong>{row.total}</strong>
                    </div>
                    <i>+</i>
                  </button>
                  <div className="lov-secondary-stat">{row.derivedLabel}</div>
                  <div className="lov-secondary-stat value">{row.derivedValue}</div>
                </div>
              );
            })}

            <div className="lov-damage-row">
              <span>Ð£Ñ€Ð¾Ð½</span>
              <strong>{buildDamageRange(totals.stats)}</strong>
            </div>

            <div className="lov-currency-row">
              <span>{character.gold}</span>
              <span>{character.gems}</span>
            </div>

            {hoveredStat ? <StatBreakdownCard breakdown={breakdowns[hoveredStat]} /> : null}
          </div>
        ) : null}

        {activeTab === 'inventory' ? (
          <div className="lov-bag-screen">
            <header className="lov-panel-header">
              <h2>Ð ÑŽÐºÐ·Ð°Ðº</h2>
            </header>
            <InventoryGrid
              state={state}
              stacks={backpack}
              selectedStackId={selectedItemStackId}
              onSelect={(inventoryStackId) => onIntent({ type: 'openItemInfo', inventoryStackId })}
              onDropStack={(inventoryStackId) => onIntent({ type: 'unequipItem', inventoryStackId })}
              dataTestId="inventory-panel"
              draggable
              fillSlots={24}
            />
          </div>
        ) : null}

        {activeTab === 'pets' ? (
          <div className="lov-pet-screen">
            <header className="lov-panel-header">
              <h2>ÐŸÐ¸Ñ‚Ð¾Ð¼Ñ†Ñ‹</h2>
            </header>
            <div className="lov-pet-thumb-row">
              {PET_VARIANTS.map((pet) => (
                <button
                  key={pet.id}
                  type="button"
                  className={`lov-pet-thumb ${selectedPet.id === pet.id ? 'active' : ''}`}
                  onClick={() => setSelectedPetId(pet.id)}
                >
                  <img src={assetPath('pet-wyvern')} alt="" />
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
              <img src={assetPath('pet-wyvern')} alt="" />
            </div>
            <div className="lov-pet-core-stats">
              <span>â¤ {selectedPet.hp}</span>
              <span>ðŸ¾ {selectedPet.damage}</span>
            </div>
            <div className="lov-pet-feeding">
              <div className="lov-pet-satiety">
                <strong>Ð¡Ñ‹Ñ‚Ð¾ÑÑ‚ÑŒ</strong>
                <span>{petSatiety}</span>
              </div>
              <div className="lov-pet-feed-buttons">
                <button type="button" onClick={() => setPetSatiety((value) => Math.min(99, value + 1))}>
                  +1
                </button>
                <button type="button" onClick={() => setPetSatiety((value) => Math.min(99, value + 10))}>
                  +10
                </button>
              </div>
              <div className="lov-pet-food">16</div>
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
              <div className="lov-profile-stat"><span>HP</span><strong>{character.maxHealth}</strong></div>
              <div className="lov-profile-stat"><span>DEF</span><strong>{totals.armor}</strong></div>
              <div className="lov-profile-stat"><span>ATK</span><strong>{totals.stats[STAT_STRENGTH]}</strong></div>
              <div className="lov-profile-stat"><span>DEX</span><strong>{totals.stats[STAT_AGILITY]}</strong></div>
              <div className="lov-profile-stat"><span>INT</span><strong>{totals.stats[STAT_INTUITION]}</strong></div>
              <div className="lov-profile-stat"><span>LCK</span><strong>{totals.stats[STAT_LUCK]}</strong></div>
            </div>
            <div className="lov-quick-slots">
              {[assetPath('icon-onyx'), '', '', ''].map((src, index) => (
                <span key={`${src}-${index}`} className={`lov-quick-slot ${src ? 'filled' : ''}`}>
                  {src ? <img src={src} alt="" /> : null}
                </span>
              ))}
            </div>
            <div className="lov-motto-box">
              <span>ÐÐµÑ‚ Ð´ÐµÐ²Ð¸Ð·Ð°</span>
              <button type="button" aria-label="Ð˜Ð·Ð¼ÐµÐ½Ð¸Ñ‚ÑŒ Ð´ÐµÐ²Ð¸Ð·" disabled>
                âœŽ
              </button>
            </div>
            <div className="lov-reward-gallery">
              <strong>ÐÐ°Ð³Ñ€Ð°Ð´Ñ‹ Ð¸ Ð¿Ð¾Ð´Ð°Ñ€ÐºÐ¸</strong>
              <div className="lov-reward-gallery-grid">
                {PROFILE_REWARDS.map((reward) => (
                  <span key={reward.id} className={`lov-profile-reward ${reward.accent}`}>
                    {reward.label === 'ÐŸÑƒÑÑ‚Ð¾' ? '' : reward.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'appearance' ? (
          <div className="lov-appearance-screen">
            <header className="lov-panel-header">
              <h2>Ð’Ð½ÐµÑˆÐ½Ð¾ÑÑ‚ÑŒ</h2>
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
              ÐÐ°Ñ‡Ð°Ñ‚ÑŒ Ð·Ð°Ð½Ð¾Ð²Ð¾ Â· 9 Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½
            </button>
          </div>
        ) : null}

        {activeTab === 'achievements' ? (
          <div className="lov-achievement-screen">
            <header className="lov-panel-header">
              <h2>Ð”Ð¾ÑÑ‚Ð¸Ð¶ÐµÐ½Ð¸Ñ</h2>
            </header>
            <div className="lov-achievement-grid">
              {PROFILE_REWARDS.map((reward) => (
                <article key={reward.id} className="lov-journal-card">
                  <h3>{reward.label === 'ÐŸÑƒÑÑ‚Ð¾' ? 'Ð¡Ð²Ð¾Ð±Ð¾Ð´Ð½Ñ‹Ð¹ ÑÐ»Ð¾Ñ‚' : reward.label}</h3>
                  <p>
                    {reward.label === 'ÐŸÑƒÑÑ‚Ð¾'
                      ? 'ÐÐ¾Ð²Ñ‹Ð¹ Ð·Ð½Ð°Ðº Ð¿Ð¾ÑÐ²Ð¸Ñ‚ÑÑ Ð·Ð´ÐµÑÑŒ Ð¿Ð¾ÑÐ»Ðµ ÑÐ»ÐµÐ´ÑƒÑŽÑ‰ÐµÐ³Ð¾ ÐºÑ€ÑƒÐ¿Ð½Ð¾Ð³Ð¾ ÑÐ¾Ð±Ñ‹Ñ‚Ð¸Ñ.'
                      : 'ÐŸÐ°Ð¼ÑÑ‚Ð½Ñ‹Ð¹ Ð·Ð½Ð°Ðº ÑƒÐ¶Ðµ Ð·Ð°Ð½ÑÐ» ÑÐ²Ð¾Ñ‘ Ð¼ÐµÑÑ‚Ð¾ Ð² ÐºÐ¾Ð»Ð»ÐµÐºÑ†Ð¸Ð¸ Ð³ÐµÑ€Ð¾Ñ.'}
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
        <div className="lov-profile-stat"><span>â¤</span><strong>{character.maxHealth}</strong></div>
        <div className="lov-profile-stat"><span>ðŸ›¡</span><strong>{totals.armor}</strong></div>
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
              <div className="lov-profile-stat"><span>HP</span><strong>{character.maxHealth}</strong></div>
              <div className="lov-profile-stat"><span>DEF</span><strong>{totals.armor}</strong></div>
              <div className="lov-profile-stat"><span>ATK</span><strong>{totals.stats[STAT_STRENGTH]}</strong></div>
              <div className="lov-profile-stat"><span>DEX</span><strong>{totals.stats[STAT_AGILITY]}</strong></div>
              <div className="lov-profile-stat"><span>INT</span><strong>{totals.stats[STAT_INTUITION]}</strong></div>
              <div className="lov-profile-stat"><span>LCK</span><strong>{totals.stats[STAT_LUCK]}</strong></div>
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
    return <div className="shell-reset-info-card lov-overlay-card">ÐŸÑ€Ð¾Ñ‚Ð¸Ð²Ð½Ð¸Ðº Ð¿Ð¾ÐºÐ° Ð½Ðµ Ð²Ñ‹Ð±Ñ€Ð°Ð½.</div>;
  }

  return (
    <div className="shell-reset-info-card lov-overlay-card" data-testid="enemy-info-popup">
      <h3>{enemy.nameRu}</h3>
      <div className="lov-profile-stats compact">
        <div className="lov-profile-stat"><span>â¤</span><strong>{enemy.health}</strong></div>
        <div className="lov-profile-stat"><span>ðŸ›¡</span><strong>{enemy.armor}</strong></div>
        <div className="lov-profile-stat"><span>ATK</span><strong>{enemy.stats[STAT_STRENGTH]}</strong></div>
        <div className="lov-profile-stat"><span>DEX</span><strong>{enemy.stats[STAT_AGILITY]}</strong></div>
        <div className="lov-profile-stat"><span>INT</span><strong>{enemy.stats[STAT_INTUITION]}</strong></div>
        <div className="lov-profile-stat"><span>LCK</span><strong>{enemy.stats[STAT_LUCK]}</strong></div>
      </div>
    </div>
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
    return <div className="shell-reset-info-card lov-overlay-card">ÐŸÑ€ÐµÐ´Ð¼ÐµÑ‚ Ð½Ðµ Ð½Ð°Ð¹Ð´ÐµÐ½.</div>;
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
      <small>Ð£Ð»ÑƒÑ‡ÑˆÐµÐ½Ð¸Ðµ: +{stack.enhancementLevel ?? 0}</small>
      {item.slot ? (
        <div className="lov-overlay-actions">
          {stack.equippedSlot ? (
            <button type="button" onClick={() => onIntent({ type: 'unequipItem', inventoryStackId: stack.id })}>
              Ð¡Ð½ÑÑ‚ÑŒ
            </button>
          ) : (
            <button type="button" onClick={() => onIntent({ type: 'equipItem', inventoryStackId: stack.id })}>
              Ð­ÐºÐ¸Ð¿Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ
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
      <h3>ÐŸÐ¸Ñ‚Ð¾Ð¼ÐµÑ†</h3>
      <p>Ð¡Ð¿ÑƒÑ‚Ð½Ð¸Ðº ÑƒÑÐ¸Ð»Ð¸Ð²Ð°ÐµÑ‚ Ð³ÐµÑ€Ð¾Ñ, Ñ€Ð°ÑÑ‚Ñ‘Ñ‚ Ñ€ÑÐ´Ð¾Ð¼ Ñ Ð½Ð¸Ð¼ Ð¸ Ð¿Ð¾Ð»ÑƒÑ‡Ð°ÐµÑ‚ ÑÐ¾Ð±ÑÑ‚Ð²ÐµÐ½Ð½ÑƒÑŽ Ð¿Ð¾Ð»Ð¾ÑÑƒ Ð¿Ñ€Ð¾Ð³Ñ€ÐµÑÑÐ°.</p>
      <div className="lov-profile-stats compact">
        <div className="lov-profile-stat"><span>â¤</span><strong>2100</strong></div>
        <div className="lov-profile-stat"><span>ðŸ¾</span><strong>40-41</strong></div>
        <div className="lov-profile-stat"><span>ðŸ²</span><strong>16</strong></div>
      </div>
    </div>
  );
}

function PaperDollPanel({
  state,
  character,
  activeTab,
  equippedBySlot,
  onIntent,
}: {
  state: BootstrapState;
  character: NonNullable<BootstrapState['character']>;
  activeTab: SheetTab;
  equippedBySlot: Partial<Record<EquipmentSlot, EquippedEntry>>;
  onIntent: (intent: GameIntent) => void;
}) {
  return (
    <div className={`lov-paperdoll ${activeTab === 'profile' ? 'profile' : ''}`}>
      <div className="lov-paperdoll-header">
        <strong>{character.name}</strong>
        <span>{character.level} ÑƒÑ€Ð¾Ð²ÐµÐ½ÑŒ</span>
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
        </div>

        <div className="lov-paperdoll-center">
          <img className="lov-paperdoll-hero" src={assetPath('hero-nocturne')} alt="" />
          {equippedBySlot.pet ? <img className="lov-paperdoll-pet" src={assetPath('pet-wyvern')} alt="" /> : null}
          <span className="lov-wing-badge">ðŸª½</span>
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
        </div>
      </div>

      {activeTab === 'profile' ? (
        <div className="lov-prestige-bar">Ð£Ñ€Ð¾Ð²ÐµÐ½ÑŒ Ð²ÐµÐ»Ð¸Ñ‡Ð¸Ñ: 12</div>
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

function AppearanceSelector({
  title,
  options,
  activeId,
  onSelect,
}: {
  title: string;
  options: Array<{ id: string; label: string; swatch?: string }>;
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
        <button type="button" aria-label={`ÐŸÑ€ÐµÐ´Ñ‹Ð´ÑƒÑ‰Ð¸Ð¹ Ð²Ð°Ñ€Ð¸Ð°Ð½Ñ‚ ${title}`} onClick={() => onSelect(prev.id)}>
          â€¹
        </button>
        {[prev, current, next].map((option, index) => (
          <span
            key={option.id}
            className={`lov-appearance-card ${index === 1 ? 'active' : ''}`}
            style={option.swatch ? ({ '--swatch': option.swatch } as CSSProperties) : undefined}
          >
            {option.swatch ? <i /> : null}
          </span>
        ))}
        <button type="button" aria-label={`Ð¡Ð»ÐµÐ´ÑƒÑŽÑ‰Ð¸Ð¹ Ð²Ð°Ñ€Ð¸Ð°Ð½Ñ‚ ${title}`} onClick={() => onSelect(next.id)}>
          â€º
        </button>
      </div>
    </section>
  );
}

function StatBreakdownCard({
  breakdown,
}: {
  breakdown: StatBreakdown;
}) {
  return (
    <div className="lov-stat-breakdown" data-testid={`stat-breakdown-${breakdown.key}`}>
      <h3>{breakdown.title}</h3>
      <div className="lov-breakdown-line"><span>Ð‘Ð°Ð·Ð¾Ð²Ð¾Ðµ Ð·Ð½Ð°Ñ‡ÐµÐ½Ð¸Ðµ</span><strong>{breakdown.base}</strong></div>
      <div className="lov-breakdown-line"><span>Ð’Ñ€ÑƒÑ‡Ð½ÑƒÑŽ Ð´Ð¾Ð±Ð°Ð²Ð»ÐµÐ½Ð¾</span><strong>+{breakdown.manual}</strong></div>
      <div className="lov-breakdown-line"><span>ÐÐ°Ð´ÐµÑ‚Ð¾Ðµ ÑÐ½Ð°Ñ€ÑÐ¶ÐµÐ½Ð¸Ðµ</span><strong>+{breakdown.equipment}</strong></div>
      <div className="lov-breakdown-line"><span>Ð­Ñ„Ñ„ÐµÐºÑ‚ Ð¾Ñ‚ Ð·ÐµÐ»ÑŒÑ</span><strong>+0</strong></div>
      <div className="lov-breakdown-line"><span>Ð­Ñ„Ñ„ÐµÐºÑ‚ Ð¾Ñ‚ Ð´Ð¾ÑÑ‚Ð¸Ð¶ÐµÐ½Ð¸Ð¹</span><strong>+0</strong></div>
      <div className="lov-breakdown-line"><span>Ð‘Ð¾Ð½ÑƒÑ ÐºÐ»Ð°Ð½Ð°</span><strong>+0</strong></div>
      <div className="lov-breakdown-line total"><span>Ð˜Ñ‚Ð¾Ð³</span><strong>{breakdown.total}</strong></div>
    </div>
  );
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
  stacks: InventoryStack[];
  selectedStackId: string | null;
  onSelect: (inventoryStackId: string) => void;
  onDropStack?: (inventoryStackId: string) => void;
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
          onDropStack(inventoryStackId);
        }
      }}
    >
      {cells.map((stack, index) => {
        if (!stack) {
          return <span key={`empty-${index}`} className="lov-grid-empty" />;
        }
        const item = state.items.find((entry) => entry.id === stack.itemId);
        return (
          <button
            key={stack.id}
            type="button"
            draggable={draggable}
            className={`shell-reset-grid-item lov-grid-item ${selectedStackId === stack.id ? 'active' : ''}`}
            onClick={() => onSelect(stack.id)}
            onDragStart={(event) => {
              if (!draggable) {
                return;
              }
              event.dataTransfer.effectAllowed = 'move';
              event.dataTransfer.setData(DRAG_STACK_TYPE, stack.id);
            }}
          >
            <ItemChip item={item} compact />
            <small>x{stack.quantity}</small>
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
      onClick={() => entry && onIntent({ type: 'openItemInfo', inventoryStackId: entry.stack.id, slot })}
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
        <ItemChip item={entry.item} compact />
      ) : (
        <span className="lov-slot-silhouette" aria-hidden="true">
          {SLOT_HINTS[slot]}
        </span>
      )}
    </button>
  );
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
      title: 'Ð¡Ð¸Ð»Ð°',
      base: (race?.baseStats[STAT_STRENGTH] ?? 0) + (CLASS_BONUSES[character.classId]?.[STAT_STRENGTH] ?? 0),
      manual: Math.max(
        0,
        character.stats[STAT_STRENGTH] - (race?.baseStats[STAT_STRENGTH] ?? 0) - (CLASS_BONUSES[character.classId]?.[STAT_STRENGTH] ?? 0),
      ),
      equipment: equipmentByStat[STAT_STRENGTH],
      total: totals.stats[STAT_STRENGTH],
      derivedLabel: 'Ð—Ð°Ñ‰Ð¸Ñ‚Ð° Ð¾Ñ‚ Ð¼ÐµÑ‡ÐµÐ¹',
      derivedValue: `${Math.round(totals.stats[STAT_STRENGTH] * 0.5 + totals.armor * 0.35)}`,
    },
    [STAT_AGILITY]: {
      key: STAT_AGILITY,
      title: 'Ð›Ð¾Ð²ÐºÐ¾ÑÑ‚ÑŒ',
      base: (race?.baseStats[STAT_AGILITY] ?? 0) + (CLASS_BONUSES[character.classId]?.[STAT_AGILITY] ?? 0),
      manual: Math.max(
        0,
        character.stats[STAT_AGILITY] - (race?.baseStats[STAT_AGILITY] ?? 0) - (CLASS_BONUSES[character.classId]?.[STAT_AGILITY] ?? 0),
      ),
      equipment: equipmentByStat[STAT_AGILITY],
      total: totals.stats[STAT_AGILITY],
      derivedLabel: 'Ð—Ð°Ñ‰Ð¸Ñ‚Ð° Ð¾Ñ‚ ÑÑ‚Ñ€ÐµÐ»',
      derivedValue: `${Math.round(totals.stats[STAT_AGILITY] * 0.5 + totals.armor * 0.2)}`,
    },
    [STAT_INTUITION]: {
      key: STAT_INTUITION,
      title: 'Ð˜Ð½Ñ‚ÑƒÐ¸Ñ†Ð¸Ñ',
      base: (race?.baseStats[STAT_INTUITION] ?? 0) + (CLASS_BONUSES[character.classId]?.[STAT_INTUITION] ?? 0),
      manual: Math.max(
        0,
        character.stats[STAT_INTUITION] -
          (race?.baseStats[STAT_INTUITION] ?? 0) -
          (CLASS_BONUSES[character.classId]?.[STAT_INTUITION] ?? 0),
      ),
      equipment: equipmentByStat[STAT_INTUITION],
      total: totals.stats[STAT_INTUITION],
      derivedLabel: 'Ð—Ð°Ñ‰Ð¸Ñ‚Ð° Ð¾Ñ‚ Ð¼Ð°Ð³Ð¸Ð¸',
      derivedValue: `${Math.round(totals.stats[STAT_INTUITION] * 0.5 + totals.armor * 0.12)}`,
    },
    [STAT_LUCK]: {
      key: STAT_LUCK,
      title: 'Ð£Ð´Ð°Ñ‡Ð°',
      base: (race?.baseStats[STAT_LUCK] ?? 0) + (CLASS_BONUSES[character.classId]?.[STAT_LUCK] ?? 0),
      manual: Math.max(
        0,
        character.stats[STAT_LUCK] - (race?.baseStats[STAT_LUCK] ?? 0) - (CLASS_BONUSES[character.classId]?.[STAT_LUCK] ?? 0),
      ),
      equipment: equipmentByStat[STAT_LUCK],
      total: totals.stats[STAT_LUCK],
      derivedLabel: 'Ð¨Ð°Ð½Ñ Ð´Ð²Ð¾Ð¹Ð½Ð¾Ð³Ð¾ ÑƒÑ€Ð¾Ð½Ð°',
      derivedValue: `${Math.min(95, Math.round(totals.stats[STAT_LUCK] * 1.4 + character.level))}%`,
    },
  } as Record<StatKey, StatBreakdown>;

  return breakdowns;
}

function buildDamageRange(stats: CharacterStats) {
  const min = Math.max(1, Math.round(stats[STAT_STRENGTH] * 1.8 + stats[STAT_AGILITY] * 0.7));
  const max = Math.max(min + 1, Math.round(min + stats[STAT_INTUITION] * 0.8 + stats[STAT_LUCK] * 0.35));
  return `${min}-${max}`;
}

function getBackpackStacks(state: BootstrapState) {
  return state.inventory.filter((stack) => !stack.equippedSlot);
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
    tags.push(`Ð‘Ñ€Ð¾Ð½Ñ +${item.armorBonus + enhancementLevel * 2}`);
  }

  return tags.length ? tags : ['Ð‘ÐµÐ· Ð±Ð¾Ð½ÑƒÑÐ¾Ð² Ðº Ñ…Ð°Ñ€Ð°ÐºÑ‚ÐµÑ€Ð¸ÑÑ‚Ð¸ÐºÐ°Ð¼'];
}

function formatPrice(item: ItemDefinition) {
  return item.priceGems && item.priceGems > 0 ? `${item.priceGems} Ð¶ÐµÐ¼Ñ‡ÑƒÐ¶Ð¸Ð½` : `${item.priceGold} Ð·Ð¾Ð»Ð¾Ñ‚Ð°`;
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
      return 'Ð¡Ð¸Ð»Ð°';
    case STAT_AGILITY:
      return 'Ð›Ð¾Ð²ÐºÐ¾ÑÑ‚ÑŒ';
    case STAT_INTUITION:
      return 'Ð˜Ð½Ñ‚ÑƒÐ¸Ñ†Ð¸Ñ';
    case STAT_LUCK:
      return 'Ð£Ð´Ð°Ñ‡Ð°';
    default:
      return stat;
  }
}

function appearanceTitle(group: AppearanceKey) {
  switch (group) {
    case 'face':
      return 'Ð›Ð¸Ñ†Ð¾';
    case 'hair':
      return 'ÐŸÑ€Ð¸Ñ‡Ñ‘ÑÐºÐ°';
    case 'color':
      return 'Ð¦Ð²ÐµÑ‚ Ð²Ð¾Ð»Ð¾Ñ';
    default:
      return group;
  }
}
