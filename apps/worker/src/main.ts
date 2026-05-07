import { Queue, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { PrismaClient } from '@prisma/client';
import { TRAVEL_QUEUE, type MarkArrivedTravelJobData } from '@lov2/shared';

const redisUrl = process.env.REDIS_URL ?? 'redis://localhost:6379';
const connection = new Redis(redisUrl, { maxRetriesPerRequest: null });
const prisma = new PrismaClient();

export const travelQueue = new Queue<MarkArrivedTravelJobData>(TRAVEL_QUEUE.name, { connection });

const worker = new Worker<MarkArrivedTravelJobData>(
  TRAVEL_QUEUE.name,
  async (job) => {
    if (job.name !== TRAVEL_QUEUE.jobs.markArrived) {
      return { ignored: true };
    }

    const travelId = String(job.data.travelId);
    const travel = await prisma.travelTask.findUnique({ where: { id: travelId } });
    if (!travel || travel.status !== 'traveling' || travel.completesAt > new Date()) {
      return { changed: false };
    }

    await prisma.$transaction([
      prisma.travelTask.update({ where: { id: travel.id }, data: { status: 'arrived' } }),
      prisma.gameEvent.create({
        data: {
          characterId: travel.characterId,
          type: 'travel.arrived',
          payload: { travelId: travel.id, locationId: travel.locationId },
        },
      }),
    ]);

    return { changed: true };
  },
  { connection },
);

worker.on('completed', (job) => {
  console.log(`[worker] completed ${job.name}:${job.id}`);
});

worker.on('failed', (job, error) => {
  console.error(`[worker] failed ${job?.name}:${job?.id}`, error);
});

process.on('SIGTERM', async () => {
  await worker.close();
  await travelQueue.close();
  await prisma.$disconnect();
  await connection.quit();
});

console.log(`[worker] ${TRAVEL_QUEUE.name} worker started`);
