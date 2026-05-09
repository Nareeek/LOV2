import type { Character, CharacterClassId, CharacterGender } from '@lov2/shared';
import { CLASS_OPTIONS } from './characterCreationOptions.js';

type CharacterIdentity = Pick<Character, 'gender' | 'raceId' | 'classId'>;

export const DEFAULT_CHARACTER_AVATAR_PATH = '/assets/generated/character-icons/avatar_male_nocturne_swordsman.png';

const CHARACTER_CLASS_ASSET_KEYS: Record<CharacterClassId, 'swordsman' | 'ranger' | 'mystic'> = {
  swordsman: 'swordsman',
  ranger: 'ranger',
  mage: 'mystic',
};

export function characterClassAssetKey(classId: CharacterClassId) {
  return CHARACTER_CLASS_ASSET_KEYS[classId];
}

export function characterClassLabel(classId: CharacterClassId) {
  return CLASS_OPTIONS.find((entry) => entry.id === classId)?.label ?? classId;
}

export function characterImagePath(character: CharacterIdentity): string {
  return characterCreationImagePath(character.gender, character.raceId, character.classId);
}

export function characterAvatarPath(character: CharacterIdentity): string {
  return `/assets/generated/character-icons/avatar_${character.gender}_${character.raceId}_${characterClassAssetKey(character.classId)}.png`;
}

export function characterCreationImagePath(
  gender: CharacterGender,
  raceId: string,
  classId: CharacterClassId,
): string {
  return `/assets/generated/character-creation/cc_${gender}_${raceId}_${characterClassAssetKey(classId)}.png`;
}

export function characterRaceSignPath(raceId: string): string {
  return `/assets/generated/character-creation/race-signs/race_sign_${raceId}.png`;
}

export function characterRaceClassLabel(raceLabel: string, classId: CharacterClassId): string {
  return `${raceLabel} / ${characterClassLabel(classId)}`;
}
