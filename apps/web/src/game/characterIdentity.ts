import type { Character, CharacterClassId, CharacterGender } from '@lov2/shared';
import { CLASS_OPTIONS } from './characterCreationOptions.js';

type CharacterIdentity = Pick<Character, 'gender' | 'raceId' | 'classId'>;

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
