import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { GameController } from './game.controller.js';
import { GameCommandsService } from './game-commands.service.js';
import { NotificationsGateway } from './notifications.gateway.js';
import { TravelQueueService } from './travel-queue.service.js';

@Module({
  imports: [AuthModule],
  controllers: [GameController],
  providers: [GameCommandsService, NotificationsGateway, TravelQueueService],
  exports: [GameCommandsService],
})
export class GameModule {}
