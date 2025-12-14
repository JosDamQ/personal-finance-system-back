import { PrismaClient, SyncQueue, SyncQueueStatus, SyncOperation, EntityType } from "@prisma/client";

const prisma = new PrismaClient();

export class SyncRepository {
  async addToQueue(
    userId: string,
    operation: SyncOperation,
    entityType: EntityType,
    entityId: string,
    data: any
  ): Promise<SyncQueue> {
    return prisma.syncQueue.create({
      data: {
        userId,
        operation,
        entityType,
        entityId,
        data,
        status: SyncQueueStatus.PENDING,
      },
    });
  }

  async getPendingItems(userId: string): Promise<SyncQueue[]> {
    return prisma.syncQueue.findMany({
      where: {
        userId,
        status: SyncQueueStatus.PENDING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getProcessingItems(userId: string): Promise<SyncQueue[]> {
    return prisma.syncQueue.findMany({
      where: {
        userId,
        status: SyncQueueStatus.PROCESSING,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async getFailedItems(userId: string): Promise<SyncQueue[]> {
    return prisma.syncQueue.findMany({
      where: {
        userId,
        status: SyncQueueStatus.FAILED,
        retryCount: {
          lt: prisma.syncQueue.fields.maxRetries,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async updateStatus(
    id: string,
    status: SyncQueueStatus,
    errorMessage?: string
  ): Promise<SyncQueue> {
    return prisma.syncQueue.update({
      where: { id },
      data: {
        status,
        errorMessage,
        updatedAt: new Date(),
      },
    });
  }

  async incrementRetryCount(id: string): Promise<SyncQueue> {
    return prisma.syncQueue.update({
      where: { id },
      data: {
        retryCount: {
          increment: 1,
        },
        updatedAt: new Date(),
      },
    });
  }

  async markAsCompleted(id: string): Promise<SyncQueue> {
    return prisma.syncQueue.update({
      where: { id },
      data: {
        status: SyncQueueStatus.COMPLETED,
        updatedAt: new Date(),
      },
    });
  }

  async markAsFailed(id: string, errorMessage: string): Promise<SyncQueue> {
    return prisma.syncQueue.update({
      where: { id },
      data: {
        status: SyncQueueStatus.FAILED,
        errorMessage,
        updatedAt: new Date(),
      },
    });
  }

  async deleteCompletedItems(userId: string, olderThan: Date): Promise<number> {
    const result = await prisma.syncQueue.deleteMany({
      where: {
        userId,
        status: SyncQueueStatus.COMPLETED,
        updatedAt: {
          lt: olderThan,
        },
      },
    });
    return result.count;
  }

  async getSyncStatus(userId: string) {
    const [pending, processing, failed, lastSync] = await Promise.all([
      prisma.syncQueue.count({
        where: { userId, status: SyncQueueStatus.PENDING },
      }),
      prisma.syncQueue.count({
        where: { userId, status: SyncQueueStatus.PROCESSING },
      }),
      prisma.syncQueue.count({
        where: { userId, status: SyncQueueStatus.FAILED },
      }),
      prisma.syncQueue.findFirst({
        where: { userId, status: SyncQueueStatus.COMPLETED },
        orderBy: { updatedAt: 'desc' },
        select: { updatedAt: true },
      }),
    ]);

    return {
      pendingItems: pending,
      processingItems: processing,
      failedItems: failed,
      lastSyncAt: lastSync?.updatedAt,
    };
  }

  async batchAddToQueue(
    userId: string,
    items: Array<{
      operation: SyncOperation;
      entityType: EntityType;
      entityId: string;
      data: any;
    }>
  ): Promise<SyncQueue[]> {
    const syncItems = await prisma.$transaction(
      items.map(item =>
        prisma.syncQueue.create({
          data: {
            userId,
            operation: item.operation,
            entityType: item.entityType,
            entityId: item.entityId,
            data: item.data,
            status: SyncQueueStatus.PENDING,
          },
        })
      )
    );
    return syncItems;
  }

  async findById(id: string): Promise<SyncQueue | null> {
    return prisma.syncQueue.findUnique({
      where: { id },
    });
  }

  async findByEntityId(
    userId: string,
    entityType: EntityType,
    entityId: string
  ): Promise<SyncQueue[]> {
    return prisma.syncQueue.findMany({
      where: {
        userId,
        entityType,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}