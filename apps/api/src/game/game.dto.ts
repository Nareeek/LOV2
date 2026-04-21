import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { STAT_KEYS } from '@lov2/game-data';
import type { StatKey } from '@lov2/shared';

export class CreateCharacterDto {
  @ApiProperty({ example: 'Матвей' })
  @IsString()
  @Length(2, 24)
  name!: string;

  @ApiProperty({ example: 'nocturne' })
  @IsString()
  raceId!: string;
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

export class EquipItemDto {
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
  @ApiProperty({ enum: ['gems'] })
  @IsIn(['gems'])
  mode!: 'gems';
}
