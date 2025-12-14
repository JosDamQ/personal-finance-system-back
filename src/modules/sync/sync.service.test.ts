import { PrismaClient } from "@prisma/client";
import { SyncService } from "./sync.service";
import { SyncOperation, EntityType } from "@prisma/client";

// Mock Prisma
jest.mock("@prisma/client", () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    syncQueue: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      deleteMany: jest.fn(),
    },
    budget: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    expense: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  })),
  SyncOperation: {
    CREATE: "CREATE",
    UPDATE: "UPDATE",
    DELETE: "DELETE",
  },
  EntityType: {
    BUDGET: "BUDGET",
    EXPENSE: "EXPENSE",
    CREDIT_CARD: "CREDIT_CARD",
    CATEGORY: "CATEGORY",
    BUDGET_PERIOD: "BUDGET_PERIOD",
  },
  SyncQueueStatus: {
    PENDING: "PENDING",
    PROCESSING: "PROCESSING",
    COMPLETED: "COMPLETED",
    FAILED: "FAILED",
  },
}));

describe("SyncService", () => {
  let syncService: SyncService;
  let mockPrisma: any;

  beforeEach(() => {
    syncService = new SyncService();
    mockPrisma = new PrismaClient();
    jest.clearAllMocks();
  });

  describe("addToSyncQueue", () => {
    it("should add item to sync queue successfully", async () => {
      const userId = "user-123";
      const syncItem = {
        operation: SyncOperation.CREATE,
        entityType: EntityType.BUDGET,
        entityId: "budget-123",
        data: { name: "Test Budget" },
      };

      const mockSyncQueueItem = {
        id: "sync-123",
        userId,
        ...syncItem,
        retryCount: 0,
        maxRetries: 3,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the repository create method through the service
      jest.spyOn(syncService['syncRepository'], 'addToQueue').mockResolvedValue(mockSyncQueueItem as any);

      const result = await syncService.addToSyncQueue(userId, syncItem);

      expect(result).toEqual({
        id: "sync-123",
        operation: SyncOperation.CREATE,
        entityType: EntityType.BUDGET,
        entityId: "budget-123",
        data: { name: "Test Budget" },
        retryCount: 0,
        maxRetries: 3,
        status: "PENDING",
        errorMessage: undefined,
        createdAt: mockSyncQueueItem.createdAt,
        updatedAt: mockSyncQueueItem.updatedAt,
      });
    });
  });

  describe("getSyncStatus", () => {
    it("should return sync status for user", async () => {
      const userId = "user-123";
      const mockStatus = {
        pendingItems: 5,
        processingItems: 2,
        failedItems: 1,
        lastSyncAt: new Date(),
      };

      jest.spyOn(syncService['syncRepository'], 'getSyncStatus').mockResolvedValue(mockStatus);

      const result = await syncService.getSyncStatus(userId);

      expect(result).toEqual({
        userId,
        ...mockStatus,
      });
    });
  });

  describe("batchAddToSyncQueue", () => {
    it("should add multiple items to sync queue", async () => {
      const userId = "user-123";
      const items = [
        {
          operation: SyncOperation.CREATE,
          entityType: EntityType.BUDGET,
          entityId: "budget-1",
          data: { name: "Budget 1" },
        },
        {
          operation: SyncOperation.UPDATE,
          entityType: EntityType.EXPENSE,
          entityId: "expense-1",
          data: { amount: 100 },
        },
      ];

      const mockSyncItems = items.map((item, index) => ({
        id: `sync-${index + 1}`,
        userId,
        ...item,
        retryCount: 0,
        maxRetries: 3,
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      jest.spyOn(syncService['syncRepository'], 'batchAddToQueue').mockResolvedValue(mockSyncItems as any);

      const result = await syncService.batchAddToSyncQueue(userId, items);

      expect(result).toHaveLength(2);
      expect(result[0].entityType).toBe(EntityType.BUDGET);
      expect(result[1].entityType).toBe(EntityType.EXPENSE);
    });
  });
});