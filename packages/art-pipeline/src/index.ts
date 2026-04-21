export interface ArtAssetRecord {
  id: string;
  path: string;
  kind: 'scene' | 'character' | 'enemy' | 'pet' | 'item' | 'ui' | 'vfx' | 'audio';
  license: 'original-generated-placeholder' | 'owned' | 'third-party-licensed';
  promptOrSource: string;
}

export const artManifest: ArtAssetRecord[] = [
  {
    id: 'scene-hub',
    path: '/assets/original/scene-hub.svg',
    kind: 'scene',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original twilight fantasy courtyard with fountain and warm tavern lights.',
  },
  {
    id: 'scene-tavern',
    path: '/assets/original/scene-tavern.svg',
    kind: 'scene',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original warm service tavern interior with parchment quest board.',
  },
  {
    id: 'scene-map',
    path: '/assets/original/scene-map.svg',
    kind: 'scene',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original moonlit harbor and route map.',
  },
  {
    id: 'scene-combat',
    path: '/assets/original/scene-combat.svg',
    kind: 'scene',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original ceremonial duel arena.',
  },
  {
    id: 'scene-inventory',
    path: '/assets/original/scene-inventory.svg',
    kind: 'scene',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original gothic equipment room with paper-doll presentation.',
  },
  {
    id: 'scene-character',
    path: '/assets/original/scene-character.svg',
    kind: 'scene',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original character growth hall with fireplace and stat runes.',
  },
  {
    id: 'scene-pets',
    path: '/assets/original/scene-pets.svg',
    kind: 'scene',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original companion roost with moonlit nest and warm lanterns.',
  },
  {
    id: 'scene-journal',
    path: '/assets/original/scene-journal.svg',
    kind: 'scene',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original social journal desk with parchment and wax seals.',
  },
  {
    id: 'hero-nocturne',
    path: '/assets/original/hero-nocturne.svg',
    kind: 'character',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original slim nocturne duelist paper-doll sprite.',
  },
  {
    id: 'enemy-ash-baron',
    path: '/assets/original/enemy-ash-baron.svg',
    kind: 'enemy',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original ash baron boss silhouette with red ceremonial blade.',
  },
  {
    id: 'pet-wyvern',
    path: '/assets/original/pet-wyvern.svg',
    kind: 'pet',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original small ember wyvern companion.',
  },
  {
    id: 'icon-rapier',
    path: '/assets/original/icon-rapier.svg',
    kind: 'item',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original rapier inventory icon.',
  },
  {
    id: 'icon-vest',
    path: '/assets/original/icon-vest.svg',
    kind: 'item',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original moon-thread vest inventory icon.',
  },
  {
    id: 'icon-onyx',
    path: '/assets/original/icon-onyx.svg',
    kind: 'item',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original lucky onyx amulet inventory icon.',
  },
  {
    id: 'icon-wyvern',
    path: '/assets/original/icon-wyvern.svg',
    kind: 'item',
    license: 'original-generated-placeholder',
    promptOrSource: 'Original ember wyvern pet token icon.',
  },
];
