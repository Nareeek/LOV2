import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TRAVEL_QUEUE } from '@lov2/shared';

type WorkerJob = {
  name: string;
  data: {
    travelId?: string;
  };
};

type WorkerProcessor = (job: WorkerJob) => Promise<unknown>;

const mocks = vi.hoisted(() => {
  const state: { processor: WorkerProcessor | undefined } = { processor: undefined };
  const queueInstance = {
    close: vi.fn(),
  };
  const workerInstance = {
    close: vi.fn(),
    on: vi.fn(),
  };
  const redisInstance = {
    quit: vi.fn(),
  };
  const prisma = {
    travelTask: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    gameEvent: {
      create: vi.fn(),
    },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  };

  return {
    state,
    queueInstance,
    workerInstance,
    redisInstance,
    prisma,
    Queue: vi.fn(function QueueMock() {
      return queueInstance;
    }),
    Worker: vi.fn(function WorkerMock(_name: string, processor: WorkerProcessor) {
      state.processor = processor;
      return workerInstance;
    }),
    Redis: vi.fn(function RedisMock() {
      return redisInstance;
    }),
    PrismaClient: vi.fn(function PrismaClientMock() {
      return prisma;
    }),
  };
});

vi.mock('bullmq', () => ({
  Queue: mocks.Queue,
  Worker: mocks.Worker,
}));

vi.mock('ioredis', () => ({
  Redis: mocks.Redis,
}));

vi.mock('@prisma/client', () => ({
  PrismaClient: mocks.PrismaClient,
}));

async function loadProcessor() {
  await import('./main.js');

  if (!mocks.state.processor) {
    throw new Error('Worker processor was not registered');
  }

  return mocks.state.processor;
}

describe('worker travel queue processor', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.state.processor = undefined;
    mocks.prisma.travelTask.findUnique.mockReset();
    mocks.prisma.travelTask.update.mockReset();
    mocks.prisma.gameEvent.create.mockReset();
    mocks.prisma.$transaction.mockReset();
  });

  it('constructs the queue and worker with the shared travel queue name', async () => {
    await loadProcessor();

    expect(mocks.Queue).toHaveBeenCalledWith(TRAVEL_QUEUE.name, { connection: mocks.redisInstance });
    expect(mocks.Worker).toHaveBeenCalledWith(TRAVEL_QUEUE.name, expect.any(Function), {
      connection: mocks.redisInstance,
    });
  });

  it('ignores unknown jobs without reading travel state', async () => {
    const processor = await loadProcessor();

    await expect(processor({ name: 'unknown-job', data: { travelId: 'travel-1' } })).resolves.toEqual({
      ignored: true,
    });
    expect(mocks.prisma.travelTask.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('marks a past-due traveling task as arrived and records a game event', async () => {
    const processor = await loadProcessor();
    const travel = {
      id: 'travel-1',
      characterId: 'character-1',
      locationId: 'forest-gate',
      status: 'traveling',
      completesAt: new Date(Date.now() - 1000),
    };
    const updateOperation = { operation: 'travelTask.update' };
    const eventOperation = { operation: 'gameEvent.create' };

    mocks.prisma.travelTask.findUnique.mockResolvedValue(travel);
    mocks.prisma.travelTask.update.mockReturnValue(updateOperation);
    mocks.prisma.gameEvent.create.mockReturnValue(eventOperation);
    mocks.prisma.$transaction.mockResolvedValue([updateOperation, eventOperation]);

    await expect(
      processor({ name: TRAVEL_QUEUE.jobs.markArrived, data: { travelId: travel.id } }),
    ).resolves.toEqual({ changed: true });

    expect(mocks.prisma.travelTask.findUnique).toHaveBeenCalledWith({ where: { id: travel.id } });
    expect(mocks.prisma.travelTask.update).toHaveBeenCalledWith({
      where: { id: travel.id },
      data: { status: 'arrived' },
    });
    expect(mocks.prisma.gameEvent.create).toHaveBeenCalledWith({
      data: {
        characterId: travel.characterId,
        type: 'travel.arrived',
        payload: { travelId: travel.id, locationId: travel.locationId },
      },
    });
    expect(mocks.prisma.$transaction).toHaveBeenCalledWith([updateOperation, eventOperation]);
  });

  it('does not change invalid or not-yet-due travel tasks', async () => {
    const processor = await loadProcessor();
    const futureTravel = {
      id: 'travel-future',
      characterId: 'character-1',
      locationId: 'forest-gate',
      status: 'traveling',
      completesAt: new Date(Date.now() + 60_000),
    };

    mocks.prisma.travelTask.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(futureTravel);

    await expect(
      processor({ name: TRAVEL_QUEUE.jobs.markArrived, data: { travelId: 'missing-travel' } }),
    ).resolves.toEqual({ changed: false });
    await expect(
      processor({ name: TRAVEL_QUEUE.jobs.markArrived, data: { travelId: futureTravel.id } }),
    ).resolves.toEqual({ changed: false });

    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.prisma.travelTask.update).not.toHaveBeenCalled();
    expect(mocks.prisma.gameEvent.create).not.toHaveBeenCalled();
  });
});
