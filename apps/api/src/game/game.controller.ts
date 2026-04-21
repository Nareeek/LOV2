import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SessionGuard, type RequestWithUser } from '../auth/session.guard.js';
import {
  AcceptQuestDto,
  AllocateStatsDto,
  CreateCharacterDto,
  EquipItemDto,
  RefillEnergyDto,
  StartTravelDto,
} from './game.dto.js';
import { GameCommandsService } from './game-commands.service.js';

@ApiTags('game')
@ApiCookieAuth()
@UseGuards(SessionGuard)
@Controller()
export class GameController {
  constructor(@Inject(GameCommandsService) private readonly commands: GameCommandsService) {}

  @Post('characters')
  createCharacter(@CurrentUser() user: RequestWithUser['user'], @Body() dto: CreateCharacterDto) {
    return this.commands.createCharacter(user.id, dto);
  }

  @Get('game/bootstrap')
  bootstrap(@CurrentUser() user: RequestWithUser['user']) {
    return this.commands.bootstrap(user.id);
  }

  @Post('quests/:id/accept')
  acceptQuest(@CurrentUser() user: RequestWithUser['user'], @Param('id') questId: string) {
    return this.commands.acceptQuest(user.id, questId);
  }

  @Post('quests/accept')
  acceptQuestLegacy(@CurrentUser() user: RequestWithUser['user'], @Body() dto: AcceptQuestDto) {
    return this.commands.acceptQuest(user.id, dto.questId);
  }

  @Post('travel/start')
  startTravel(@CurrentUser() user: RequestWithUser['user'], @Body() dto: StartTravelDto) {
    return this.commands.startTravel(user.id, dto);
  }

  @Post('travel/:id/claim')
  claimTravel(@CurrentUser() user: RequestWithUser['user'], @Param('id') travelId: string) {
    return this.commands.claimTravel(user.id, travelId);
  }

  @Post('combat/:id/resolve')
  resolveCombat(@CurrentUser() user: RequestWithUser['user'], @Param('id') combatId: string) {
    return this.commands.resolveCombat(user.id, combatId);
  }

  @Post('inventory/:id/equip')
  equipItem(@CurrentUser() user: RequestWithUser['user'], @Param('id') inventoryStackId: string) {
    return this.commands.equipItem(user.id, inventoryStackId);
  }

  @Post('inventory/equip')
  equipItemLegacy(@CurrentUser() user: RequestWithUser['user'], @Body() dto: EquipItemDto) {
    return this.commands.equipItem(user.id, dto.inventoryStackId);
  }

  @Post('stats/allocate')
  allocateStats(@CurrentUser() user: RequestWithUser['user'], @Body() dto: AllocateStatsDto) {
    return this.commands.allocateStats(user.id, dto);
  }

  @Post('rebirth/start')
  startRebirth(@CurrentUser() user: RequestWithUser['user']) {
    return this.commands.startRebirth(user.id);
  }

  @Post('energy/refill')
  refillEnergy(@CurrentUser() user: RequestWithUser['user'], @Body() dto: RefillEnergyDto) {
    return this.commands.refillEnergy(user.id, dto);
  }
}
