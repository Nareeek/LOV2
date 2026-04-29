export interface ArtAssetRecord {
  id: string;
  path: string;
  kind: 'scene' | 'character' | 'enemy' | 'pet' | 'item' | 'ui' | 'vfx' | 'audio';
  license: 'original-generated-placeholder' | 'owned' | 'third-party-licensed';
  promptOrSource: string;
}

const GENERATED_LICENSE = 'original-generated-placeholder' as const;

function generatedSource(sourceFile: string): string {
  return `AI-generated original LOV2 asset. Source file: ${sourceFile}. Tool/source: Leonardo/Recraft/unknown. Needs final license review.`;
}

export const artManifest: ArtAssetRecord[] = [
  {
    id: 'scene-hub',
    path: '/assets/generated/scenes/scene-hub.jpg',
    kind: 'scene',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets/Backgrounds/background_001_Main_courtyard.jpg'),
  },
  {
    id: 'scene-tavern',
    path: '/assets/generated/scenes/scene-tavern.jpg',
    kind: 'scene',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets/Backgrounds/background_004_Tavern_shop_interior.jpg'),
  },
  {
    id: 'scene-map',
    path: '/assets/generated/scenes/scene-map.jpg',
    kind: 'scene',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets/Backgrounds/background_002_harbor_port_background.jpg'),
  },
  {
    id: 'scene-combat',
    path: '/assets/generated/scenes/scene-combat.jpg',
    kind: 'scene',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets/Backgrounds/background_003_Combat_arena_background.jpg'),
  },
  {
    id: 'scene-inventory',
    path: '/assets/generated/scenes/scene-inventory.jpg',
    kind: 'scene',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets/Backgrounds/background_005_Character_equipment_room.jpg'),
  },
  {
    id: 'scene-character',
    path: '/assets/generated/scenes/scene-character.jpg',
    kind: 'scene',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_missing/scenes/scene-character.jpg'),
  },
  {
    id: 'scene-pets',
    path: '/assets/generated/scenes/scene-pets.jpg',
    kind: 'scene',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_missing/scenes/scene-pets.jpg'),
  },
  {
    id: 'scene-journal',
    path: '/assets/generated/scenes/scene-journal.jpg',
    kind: 'scene',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_missing/scenes/scene-journal.jpg'),
  },
  {
    id: 'hero-nocturne',
    path: '/assets/generated/characters/hero-nocturne.png',
    kind: 'character',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/characters/hero-nocturne.png'),
  },
  {
    id: 'hero-nocturne-without-armor',
    path: '/assets/generated/characters/hero-nocturne-without-armor.png',
    kind: 'character',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/characters/hero-nocturne_without_armor.png'),
  },
  {
    id: 'hero-nocturne-without-armor-with-sword',
    path: '/assets/generated/characters/hero-nocturne-without-armor-with-sword.png',
    kind: 'character',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/characters/hero-nocturne_without_armor_with_sword.png'),
  },
  {
    id: 'hero-nocturne-without-sword',
    path: '/assets/generated/characters/hero-nocturne-without-sword.png',
    kind: 'character',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/characters/hero-nocturne_without_sword.png'),
  },
  {
    id: 'enemy-ash-baron',
    path: '/assets/generated/enemies/enemy-ash-baron.png',
    kind: 'enemy',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/enemies/enemy-ash-baron.png'),
  },
  {
    id: 'pet-wyvern',
    path: '/assets/generated/pets/pet-wyvern.png',
    kind: 'pet',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/pets/pet-wyvern.png'),
  },
  {
    id: 'pet-dragon',
    path: '/assets/generated/pets/pet-dragon.png',
    kind: 'pet',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/pets/pet-dragon.png'),
  },
  {
    id: 'pet-cat',
    path: '/assets/generated/pets/pet-cat.png',
    kind: 'pet',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/pets/pet-cat.png'),
  },
  {
    id: 'pet-wolf',
    path: '/assets/generated/pets/pet-wolf.png',
    kind: 'pet',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/pets/pet-wolf.png'),
  },
  {
    id: 'icon-rapier',
    path: '/assets/generated/items/icon-rapier.png',
    kind: 'item',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/items/icon-rapier.png'),
  },
  {
    id: 'icon-vest',
    path: '/assets/generated/items/icon-vest.png',
    kind: 'item',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/items/icon-vest.png'),
  },
  {
    id: 'icon-onyx',
    path: '/assets/generated/items/icon-onyx.png',
    kind: 'item',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/items/icon-onyx.png'),
  },
  {
    id: 'icon-wyvern',
    path: '/assets/generated/items/icon-wyvern.png',
    kind: 'item',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets_transparent/items/icon-wyvern.png'),
  },
  {
    id: 'icon-moon-gem',
    path: '/assets/generated/items/icon-moon-gem.jpg',
    kind: 'item',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets/Equipment/Equipment_item_icon_009_Gem_premium_currency_icon.jpg'),
  },
  {
    id: 'icon-gold-coin',
    path: '/assets/generated/items/icon-gold-coin.jpg',
    kind: 'item',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets/Equipment/Equipment_item_icon_010_Gold_coin_icon.jpg'),
  },
  {
    id: 'ui-appearance-face-card',
    path: '/assets/generated/ui/appearance/ui-appearance-face-card.jpg',
    kind: 'ui',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets/Appearance/Appearance_customization_001_Face_selection_card.jpg'),
  },
  {
    id: 'ui-appearance-hair-style',
    path: '/assets/generated/ui/appearance/ui-appearance-hair-style.jpg',
    kind: 'ui',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets/Appearance/Appearance_customization_002_Hair_style_thumbnail.jpg'),
  },
  {
    id: 'ui-appearance-hair-color',
    path: '/assets/generated/ui/appearance/ui-appearance-hair-color.jpg',
    kind: 'ui',
    license: GENERATED_LICENSE,
    promptOrSource: generatedSource('_incoming_assets/Appearance/Appearance_customization_003_Hair_color_thumbnail.jpg'),
  },
];
