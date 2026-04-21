import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';

@Injectable()
export class TravelQueueService implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly queue: Queue;

  constructor(@Inject(ConfigService) config: ConfigService) {
    this.connection = new Redis(config.get<string>('REDIS_URL') ?? 'redis://localhost:6379', {
      maxRetriesPerRequest: null,
    });
    this.queue = new Queue('travel-events', { connection: this.connection });
  }

  async scheduleArrival(travelId: string, completesAt: Date) {
    await this.queue.add(
      'mark-arrived',
      { travelId },
      {
        delay: Math.max(0, completesAt.getTime() - Date.now()),
        removeOnComplete: 1000,
        removeOnFail: 1000,
      },
    );
  }

  async onModuleDestroy() {
    await this.queue.close();
    await this.connection.quit();
  }
}
