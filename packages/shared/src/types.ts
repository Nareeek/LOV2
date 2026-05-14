export type StatKey = 'сила' | 'ловкость' | 'интуиция' | 'удача';

export type SceneId =
  | 'hub'
  | 'tavern'
  | 'map'
  | 'combat'
  | 'inventory'
  | 'character'
  | 'pets'
  | 'journal';

export type ScenePanelId =
  | 'contracts'
  | 'travel'
  | 'combat'
  | 'arena'
  | 'inventory'
  | 'character'
  | 'pets'
  | 'journal'
  | 'reward'
  | 'fountain'
  | 'store'
  | 'forge'
  | 'tower'
  | 'boatman';

export interface CharacterStats {
  сила: number;
  ловкость: number;
  интуиция: number;
  удача: number;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expiresAt: string;
}

export interface Race {
  id: string;
  nameRu: string;
  descriptionRu: string;
  baseStats: CharacterStats;
  passiveRu: string;
}

export type CharacterGender = 'male' | 'female';

export type CharacterClassId = 'swordsman' | 'ranger' | 'mage';

export type CombatSource = 'travel' | 'arena' | 'legacy';

export interface Character {
  id: string;
  userId: string;
  name: string;
  raceId: string;
  gender: CharacterGender;
  classId: CharacterClassId;
  level: number;
  experience: number;
  rebirths: number;
  health: number;
  maxHealth: number;
  unspentStatPoints: number;
  stats: CharacterStats;
  gold: number;
  gems: number;
  petFood: number;
  energy: number;
  maxEnergy: number;
  energyUpdatedAt: string;
  createdAt: string;
}

export type EquipmentSlot =
  | 'weapon'
  | 'helmet'
  | 'armor'
  | 'gloves'
  | 'boots'
  | 'amulet'
  | 'ring'
  | 'pet';

export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface PetCombatStats {
  level: number;
  health: number;
}

export interface ItemDefinition {
  id: string;
  nameRu: string;
  descriptionRu: string;
  iconAssetId: string;
  slot?: EquipmentSlot;
  rarity: ItemRarity;
  priceGold: number;
  priceGems?: number;
  armorBonus?: number;
  forgeable?: boolean;
  statBonus: Partial<CharacterStats>;
  petCombatStats?: PetCombatStats;
}

export interface InventoryStack {
  id: string;
  characterId: string;
  itemId: string;
  quantity: number;
  enhancementLevel?: number;
  equippedSlot?: EquipmentSlot;
}

export interface CharacterPetState {
  id: string;
  characterId: string;
  petId: string;
  food: number;
  experience: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuestDefinition {
  id: string;
  titleRu: string;
  descriptionRu: string;
  locationId: string;
  enemyId: string;
  energyCost: number;
  reward: Reward;
}

export interface QuestProgress {
  id: string;
  characterId: string;
  questId: string;
  status: 'available' | 'active' | 'completed' | 'claimed';
  progress: number;
  target: number;
}

export interface LocationDefinition {
  id: string;
  nameRu: string;
  descriptionRu: string;
  travelSeconds: number;
  sceneAssetId: string;
}

export interface SceneRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type SceneHotspotKind =
  | 'door'
  | 'board'
  | 'npc'
  | 'route'
  | 'tower'
  | 'forge'
  | 'boat'
  | 'shop'
  | 'arena'
  | 'hero'
  | 'pet'
  | 'reward'
  | 'portal';

export interface SceneHotspotVisual {
  kind: SceneHotspotKind;
  accent?: 'gold' | 'mint' | 'ember' | 'moon';
  labelSide?: 'top' | 'bottom';
}

export type SceneAction =
  | { type: 'openScene'; sceneId: SceneId }
  | { type: 'openPanel'; panelId: ScenePanelId }
  | { type: 'travelNode'; locationId: string; questId?: string }
  | { type: 'combatNode' }
  | { type: 'equipFirst' };

export interface SceneHotspot {
  id: string;
  labelRu: string;
  descriptionRu: string;
  rect: SceneRect;
  action: SceneAction;
  visual?: SceneHotspotVisual;
}

export interface SceneDefinition {
  id: SceneId;
  nameRu: string;
  descriptionRu: string;
  sceneAssetId: string;
  ambientLayerIds: string[];
  hotspots: SceneHotspot[];
}

export interface TravelTask {
  id: string;
  characterId: string;
  locationId: string;
  questId?: string;
  status: 'traveling' | 'arrived' | 'claimed';
  startedAt: string;
  completesAt: string;
}

export interface EnemyDefinition {
  id: string;
  nameRu: string;
  level: number;
  health: number;
  armor: number;
  stats: CharacterStats;
  boss: boolean;
  reward: Reward;
}

export interface CombatEncounter {
  id: string;
  characterId: string;
  enemyId: string;
  questId?: string;
  source?: CombatSource;
  status: 'pending' | 'won' | 'lost';
  log?: CombatLog;
  createdAt: string;
}

export interface CombatLog {
  winner: 'character' | 'enemy';
  turns: CombatTurn[];
  reward: Reward;
  petId?: string;
  petFoodSpent?: number;
  petExperienceGained?: number;
  petTurns?: number;
}

export interface CombatTurn {
  turn: number;
  actor: 'character' | 'enemy' | 'pet';
  target?: 'character' | 'enemy' | 'pet';
  damage: number;
  critical: boolean;
  targetHealth: number;
}

export interface Reward {
  experience: number;
  gold: number;
  gems: number;
  itemIds: string[];
}

export interface CurrencyLedgerEntry {
  id: string;
  characterId: string;
  currency: 'gold' | 'gems';
  amount: number;
  reason: string;
  createdAt: string;
}

export interface PaymentOrder {
  id: string;
  userId: string;
  stripeSessionId?: string;
  status: 'created' | 'paid' | 'failed' | 'refunded';
  gems: number;
  amountMinor: number;
  currency: 'usd';
  createdAt: string;
}

export interface BootstrapState {
  user: User | null;
  character: Character | null;
  races: Race[];
  items: ItemDefinition[];
  quests: QuestDefinition[];
  locations: LocationDefinition[];
  enemies: EnemyDefinition[];
  scenes: SceneDefinition[];
  inventory: InventoryStack[];
  petRoster: CharacterPetState[];
  questProgress: QuestProgress[];
  travels: TravelTask[];
  combats: CombatEncounter[];
}
