import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { STAT_KEYS } from '@lov2/game-data';
import type { CharacterClassId, CharacterGender, StatKey } from '@lov2/shared';

const CHARACTER_GENDERS: CharacterGender[] = ['male', 'female'];
const CHARACTER_CLASSES: CharacterClassId[] = ['swordsman', 'ranger', 'mage'];
const ENERGY_REFILL_MODES = ['cup', 'bundle'] as const;

export class CreateCharacterDto {
  @ApiProperty({ example: 'Матвей' })
  @IsString()
  @Length(2, 24)
  name!: string;

  @ApiProperty({ example: 'nocturne' })
  @IsString()
  raceId!: string;

  @ApiProperty({ enum: CHARACTER_GENDERS, example: 'male' })
  @IsIn(CHARACTER_GENDERS)
  gender!: CharacterGender;

  @ApiProperty({ enum: CHARACTER_CLASSES, example: 'swordsman' })
  @IsIn(CHARACTER_CLASSES)
  classId!: CharacterClassId;
}

export class AcceptQuestDto {
  @ApiProperty({ example: 'tavern-first-contract' })
  @IsString()
  questId!: string;
}

export class StartTravelDto {
  @ApiProperty({ example: 'old-tavern' })
  @IsString()
  locationId!: string;

  @ApiProperty({ example: 'tavern-first-contract', required: false })
  @IsOptional()
  @IsString()
  questId?: string;
}

export class ClaimTravelDto {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  rush?: boolean;
}

export class EquipItemDto {
  @ApiProperty({ example: 'inventory-stack-id' })
  @IsString()
  inventoryStackId!: string;
}

export class UnequipItemDto {
  @ApiProperty({ example: 'inventory-stack-id' })
  @IsString()
  inventoryStackId!: string;
}

export class AllocateStatsDto {
  @ApiProperty({ enum: STAT_KEYS })
  @IsIn(STAT_KEYS)
  stat!: StatKey;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  points!: number;
}

export class RefillEnergyDto {
  @ApiProperty({ enum: ENERGY_REFILL_MODES })
  @IsIn(ENERGY_REFILL_MODES)
  mode!: (typeof ENERGY_REFILL_MODES)[number];
}

export class PurchaseItemDto {
  @ApiProperty({ example: 'moon-vest' })
  @IsString()
  itemId!: string;
}

export class ForgeUpgradeDto {
  @ApiProperty({ example: 'inventory-stack-id' })
  @IsString()
  inventoryStackId!: string;
}

export class StartArenaDto {
  @ApiProperty({ example: 'mist-bandit' })
  @IsString()
  enemyId!: string;
}

export class ResolveCombatDto {
  @ApiProperty({ example: 'kitten', required: false })
  @IsOptional()
  @IsString()
  petId?: string;
}

export class FeedPetDto {
  @ApiProperty({ enum: [1, 10], example: 1 })
  @IsIn([1, 10])
  amount!: 1 | 10;
}
