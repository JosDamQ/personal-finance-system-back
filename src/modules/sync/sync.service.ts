import { PrismaClient, SyncOperation, EntityType, SyncQueueStatus } from "@prisma/client";
import { SyncRepository } from "./sync.repository";
import {
  SyncQueueItemDto,
  SyncQueueResponse,
  SyncStatusResponse,
  SyncResult,
  ConflictItem,
  ConflictResolutionDto,
} from "./sync.types";

const prisma = new PrismaClient();

export class SyncService {
  private syncRepository: SyncRepository;

  constructor() {
    this.syncRepository = new SyncRepository();
  }

  async addToSyncQueue(
    userId: string,
    item: SyncQueueItemDto
  ): Promise<SyncQueueResponse> {
    const syncItem = await this.syncRepository.addToQueue(
      userId,
      item.operation,
      item.entityType,
      item.entityId,
      item.data
    );
    return this.mapToResponse(syncItem);
  }

  async batchAddToSyncQueue(
    userId: string,
    items: SyncQueueItemDto[]
  ): Promise<SyncQueueResponse[]> {
    const syncItems = await this.syncRepository.batchAddToQueue(userId, items);
    return syncItems.map(this.mapToResponse);
  }

  async processSyncQueue(userId: string): Promise<SyncResult> {
    const pendingItems = await this.syncRepository.getPendingItems(userId);
    const failedItems = await this.syncRepository.getFailedItems(userId);
    
    const allItems = [...pendingItems, ...failedItems];
    let processed = 0;
    let successful = 0;
    let failed = 0;
    let conflicts = 0;
    const errors: string[] = [];

    for (const item of allItems) {
      try {
        // Mark as processing
        await this.syncRepository.updateStatus(item.id, SyncQueueStatus.PROCESSING);
        
        // Process the sync item
        const result = await this.processSyncItem(item);
        
        if (result.success) {
          await this.syncRepository.markAsCompleted(item.id);
          successful++;
        } else if (result.isConflict) {
          // Handle conflict - for now, we'll mark as failed and let user resolve
          await this.syncRepository.markAsFailed(item.id, result.error || 'Conflict detected');
          conflicts++;
        } else {
          // Increment retry count and mark as failed if max retries reached
          await this.syncRepository.incrementRetryCount(item.id);
          const updatedItem = await this.syncRepository.findById(item.id);
          
          if (updatedItem && updatedItem.retryCount >= updatedItem.maxRetries) {
            await this.syncRepository.markAsFailed(item.id, result.error || 'Max retries exceeded');
            failed++;
          } else {
            // Will be retried later
            await this.syncRepository.updateStatus(item.id, SyncQueueStatus.PENDING);
          }
          
          if (result.error) {
            errors.push(result.error);
          }
        }
        
        processed++;
      } catch (error) {
        console.error(`Error processing sync item ${item.id}:`, error);
        await this.syncRepository.markAsFailed(item.id, error instanceof Error ? error.message : 'Unknown error');
        failed++;
        processed++;
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return {
      processed,
      successful,
      failed,
      conflicts,
      errors,
    };
  }

  private async processSyncItem(item: any): Promise<{
    success: boolean;
    isConflict?: boolean;
    error?: string;
  }> {
    try {
      switch (item.entityType) {
        case EntityType.BUDGET:
          return await this.processBudgetSync(item);
        case EntityType.EXPENSE:
          return await this.processExpenseSync(item);
        case EntityType.CREDIT_CARD:
          return await this.processCreditCardSync(item);
        case EntityType.CATEGORY:
          return await this.processCategorySync(item);
        case EntityType.BUDGET_PERIOD:
          return await this.processBudgetPeriodSync(item);
        default:
          return { success: false, error: `Unknown entity type: ${item.entityType}` };
      }
    } catch (error) {
      console.error(`Error processing ${item.entityType} sync:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async processBudgetSync(item: any): Promise<{
    success: boolean;
    isConflict?: boolean;
    error?: string;
  }> {
    const { operation, entityId, data } = item;

    try {
      switch (operation) {
        case SyncOperation.CREATE:
          // Check if budget already exists
          const existingBudget = await prisma.budget.findUnique({
            where: { id: entityId },
          });
          
          if (existingBudget) {
            // Conflict: budget already exists
            return { success: false, isConflict: true, error: 'Budget already exists' };
          }
          
          await prisma.budget.create({ data });
          return { success: true };

        case SyncOperation.UPDATE:
          const budgetToUpdate = await prisma.budget.findUnique({
            where: { id: entityId },
          });
          
          if (!budgetToUpdate) {
            return { success: false, error: 'Budget not found for update' };
          }
          
          // Check for conflicts (compare updatedAt timestamps)
          if (budgetToUpdate.updatedAt > new Date(data.updatedAt)) {
            return { success: false, isConflict: true, error: 'Budget was modified more recently on server' };
          }
          
          await prisma.budget.update({
            where: { id: entityId },
            data,
          });
          return { success: true };

        case SyncOperation.DELETE:
          await prisma.budget.delete({
            where: { id: entityId },
          });
          return { success: true };

        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        // Item was already deleted, consider it successful
        return { success: true };
      }
      throw error;
    }
  }

  private async processExpenseSync(item: any): Promise<{
    success: boolean;
    isConflict?: boolean;
    error?: string;
  }> {
    const { operation, entityId, data } = item;

    try {
      switch (operation) {
        case SyncOperation.CREATE:
          const existingExpense = await prisma.expense.findUnique({
            where: { id: entityId },
          });
          
          if (existingExpense) {
            return { success: false, isConflict: true, error: 'Expense already exists' };
          }
          
          await prisma.expense.create({ data });
          return { success: true };

        case SyncOperation.UPDATE:
          const expenseToUpdate = await prisma.expense.findUnique({
            where: { id: entityId },
          });
          
          if (!expenseToUpdate) {
            return { success: false, error: 'Expense not found for update' };
          }
          
          if (expenseToUpdate.updatedAt > new Date(data.updatedAt)) {
            return { success: false, isConflict: true, error: 'Expense was modified more recently on server' };
          }
          
          await prisma.expense.update({
            where: { id: entityId },
            data,
          });
          return { success: true };

        case SyncOperation.DELETE:
          await prisma.expense.delete({
            where: { id: entityId },
          });
          return { success: true };

        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return { success: true };
      }
      throw error;
    }
  }

  private async processCreditCardSync(item: any): Promise<{
    success: boolean;
    isConflict?: boolean;
    error?: string;
  }> {
    const { operation, entityId, data } = item;

    try {
      switch (operation) {
        case SyncOperation.CREATE:
          const existingCard = await prisma.creditCard.findUnique({
            where: { id: entityId },
          });
          
          if (existingCard) {
            return { success: false, isConflict: true, error: 'Credit card already exists' };
          }
          
          await prisma.creditCard.create({ data });
          return { success: true };

        case SyncOperation.UPDATE:
          const cardToUpdate = await prisma.creditCard.findUnique({
            where: { id: entityId },
          });
          
          if (!cardToUpdate) {
            return { success: false, error: 'Credit card not found for update' };
          }
          
          if (cardToUpdate.updatedAt > new Date(data.updatedAt)) {
            return { success: false, isConflict: true, error: 'Credit card was modified more recently on server' };
          }
          
          await prisma.creditCard.update({
            where: { id: entityId },
            data,
          });
          return { success: true };

        case SyncOperation.DELETE:
          await prisma.creditCard.delete({
            where: { id: entityId },
          });
          return { success: true };

        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return { success: true };
      }
      throw error;
    }
  }

  private async processCategorySync(item: any): Promise<{
    success: boolean;
    isConflict?: boolean;
    error?: string;
  }> {
    const { operation, entityId, data } = item;

    try {
      switch (operation) {
        case SyncOperation.CREATE:
          const existingCategory = await prisma.category.findUnique({
            where: { id: entityId },
          });
          
          if (existingCategory) {
            return { success: false, isConflict: true, error: 'Category already exists' };
          }
          
          await prisma.category.create({ data });
          return { success: true };

        case SyncOperation.UPDATE:
          const categoryToUpdate = await prisma.category.findUnique({
            where: { id: entityId },
          });
          
          if (!categoryToUpdate) {
            return { success: false, error: 'Category not found for update' };
          }
          
          if (categoryToUpdate.updatedAt > new Date(data.updatedAt)) {
            return { success: false, isConflict: true, error: 'Category was modified more recently on server' };
          }
          
          await prisma.category.update({
            where: { id: entityId },
            data,
          });
          return { success: true };

        case SyncOperation.DELETE:
          await prisma.category.delete({
            where: { id: entityId },
          });
          return { success: true };

        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return { success: true };
      }
      throw error;
    }
  }

  private async processBudgetPeriodSync(item: any): Promise<{
    success: boolean;
    isConflict?: boolean;
    error?: string;
  }> {
    const { operation, entityId, data } = item;

    try {
      switch (operation) {
        case SyncOperation.CREATE:
          const existingPeriod = await prisma.budgetPeriod.findUnique({
            where: { id: entityId },
          });
          
          if (existingPeriod) {
            return { success: false, isConflict: true, error: 'Budget period already exists' };
          }
          
          await prisma.budgetPeriod.create({ data });
          return { success: true };

        case SyncOperation.UPDATE:
          const periodToUpdate = await prisma.budgetPeriod.findUnique({
            where: { id: entityId },
          });
          
          if (!periodToUpdate) {
            return { success: false, error: 'Budget period not found for update' };
          }
          
          if (periodToUpdate.updatedAt > new Date(data.updatedAt)) {
            return { success: false, isConflict: true, error: 'Budget period was modified more recently on server' };
          }
          
          await prisma.budgetPeriod.update({
            where: { id: entityId },
            data,
          });
          return { success: true };

        case SyncOperation.DELETE:
          await prisma.budgetPeriod.delete({
            where: { id: entityId },
          });
          return { success: true };

        default:
          return { success: false, error: `Unknown operation: ${operation}` };
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('Record to delete does not exist')) {
        return { success: true };
      }
      throw error;
    }
  }

  async getSyncStatus(userId: string): Promise<SyncStatusResponse> {
    const status = await this.syncRepository.getSyncStatus(userId);
    return {
      userId,
      ...status,
    };
  }

  async getConflicts(userId: string): Promise<ConflictItem[]> {
    const failedItems = await prisma.syncQueue.findMany({
      where: {
        userId,
        status: SyncQueueStatus.FAILED,
        errorMessage: {
          contains: 'Conflict',
        },
      },
    });

    const conflicts: ConflictItem[] = [];
    
    for (const item of failedItems) {
      try {
        // Get current server data for comparison
        const remoteData = await this.getRemoteEntityData(item.entityType, item.entityId);
        
        if (remoteData) {
          conflicts.push({
            id: item.id,
            entityType: item.entityType,
            entityId: item.entityId,
            localData: item.data,
            remoteData,
            conflictReason: item.errorMessage || 'Data conflict detected',
          });
        }
      } catch (error) {
        console.error(`Error getting remote data for conflict ${item.id}:`, error);
      }
    }

    return conflicts;
  }

  private async getRemoteEntityData(entityType: EntityType, entityId: string): Promise<any> {
    switch (entityType) {
      case EntityType.BUDGET:
        return prisma.budget.findUnique({ where: { id: entityId } });
      case EntityType.EXPENSE:
        return prisma.expense.findUnique({ where: { id: entityId } });
      case EntityType.CREDIT_CARD:
        return prisma.creditCard.findUnique({ where: { id: entityId } });
      case EntityType.CATEGORY:
        return prisma.category.findUnique({ where: { id: entityId } });
      case EntityType.BUDGET_PERIOD:
        return prisma.budgetPeriod.findUnique({ where: { id: entityId } });
      default:
        return null;
    }
  }

  async resolveConflict(
    userId: string,
    conflictId: string,
    resolution: ConflictResolutionDto
  ): Promise<boolean> {
    const syncItem = await this.syncRepository.findById(conflictId);
    
    if (!syncItem || syncItem.userId !== userId) {
      throw new Error('Conflict not found or access denied');
    }

    try {
      switch (resolution.resolution) {
        case 'LOCAL':
          // Use local data (from sync queue)
          await this.forceSyncItem(syncItem);
          break;
        case 'REMOTE':
          // Keep remote data (mark as completed without syncing)
          await this.syncRepository.markAsCompleted(conflictId);
          break;
        case 'MERGE':
          // Use merged data provided by client
          if (!resolution.mergedData) {
            throw new Error('Merged data required for MERGE resolution');
          }
          const mergedItem = { ...syncItem, data: resolution.mergedData };
          await this.forceSyncItem(mergedItem);
          break;
        default:
          throw new Error(`Unknown resolution type: ${resolution.resolution}`);
      }
      
      return true;
    } catch (error) {
      console.error(`Error resolving conflict ${conflictId}:`, error);
      throw error;
    }
  }

  private async forceSyncItem(item: any): Promise<void> {
    // Force sync without conflict checking
    const { operation, entityType, entityId, data } = item;

    switch (entityType) {
      case EntityType.BUDGET:
        if (operation === SyncOperation.CREATE || operation === SyncOperation.UPDATE) {
          await prisma.budget.upsert({
            where: { id: entityId },
            create: data,
            update: data,
          });
        } else if (operation === SyncOperation.DELETE) {
          await prisma.budget.deleteMany({ where: { id: entityId } });
        }
        break;
      case EntityType.EXPENSE:
        if (operation === SyncOperation.CREATE || operation === SyncOperation.UPDATE) {
          await prisma.expense.upsert({
            where: { id: entityId },
            create: data,
            update: data,
          });
        } else if (operation === SyncOperation.DELETE) {
          await prisma.expense.deleteMany({ where: { id: entityId } });
        }
        break;
      case EntityType.CREDIT_CARD:
        if (operation === SyncOperation.CREATE || operation === SyncOperation.UPDATE) {
          await prisma.creditCard.upsert({
            where: { id: entityId },
            create: data,
            update: data,
          });
        } else if (operation === SyncOperation.DELETE) {
          await prisma.creditCard.deleteMany({ where: { id: entityId } });
        }
        break;
      case EntityType.CATEGORY:
        if (operation === SyncOperation.CREATE || operation === SyncOperation.UPDATE) {
          await prisma.category.upsert({
            where: { id: entityId },
            create: data,
            update: data,
          });
        } else if (operation === SyncOperation.DELETE) {
          await prisma.category.deleteMany({ where: { id: entityId } });
        }
        break;
      case EntityType.BUDGET_PERIOD:
        if (operation === SyncOperation.CREATE || operation === SyncOperation.UPDATE) {
          await prisma.budgetPeriod.upsert({
            where: { id: entityId },
            create: data,
            update: data,
          });
        } else if (operation === SyncOperation.DELETE) {
          await prisma.budgetPeriod.deleteMany({ where: { id: entityId } });
        }
        break;
    }

    await this.syncRepository.markAsCompleted(item.id);
  }

  async cleanupOldSyncItems(userId: string, daysOld: number = 7): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    return this.syncRepository.deleteCompletedItems(userId, cutoffDate);
  }

  private mapToResponse(syncItem: any): SyncQueueResponse {
    return {
      id: syncItem.id,
      operation: syncItem.operation,
      entityType: syncItem.entityType,
      entityId: syncItem.entityId,
      data: syncItem.data,
      retryCount: syncItem.retryCount,
      maxRetries: syncItem.maxRetries,
      status: syncItem.status,
      errorMessage: syncItem.errorMessage,
      createdAt: syncItem.createdAt,
      updatedAt: syncItem.updatedAt,
    };
  }
}