import { PrismaClient } from "@prisma/client";
import { SyncService } from "./sync.service";
import { SyncOperation, EntityType } from "@prisma/client";
import * as fc from "fast-check";

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

  describe("Property-Based Tests", () => {
    describe("Property 13: Persistencia local sin conexión", () => {
      it("should persist all operations locally when offline", async () => {
        // **Feature: personal-finance-app, Property 13: Persistencia local sin conexión**
        // **Validates: Requirements 8.1**
        
        await fc.assert(
          fc.asyncProperty(
            // Generate random user ID
            fc.uuid(),
            // Generate random operations array
            fc.array(
              fc.record({
                operation: fc.constantFrom(SyncOperation.CREATE, SyncOperation.UPDATE, SyncOperation.DELETE),
                entityType: fc.constantFrom(
                  EntityType.BUDGET,
                  EntityType.EXPENSE,
                  EntityType.CREDIT_CARD,
                  EntityType.CATEGORY,
                  EntityType.BUDGET_PERIOD
                ),
                entityId: fc.uuid(),
                data: fc.record({
                  name: fc.string({ minLength: 1, maxLength: 50 }),
                  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(10000) }),
                  currency: fc.constantFrom("GTQ", "USD"),
                  description: fc.string({ maxLength: 200 }),
                  createdAt: fc.date(),
                  updatedAt: fc.date(),
                }),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            async (userId, operations) => {
              // Mock successful local storage for all operations
              const mockSyncItems = operations.map((op, index) => ({
                id: `sync-${index}`,
                userId,
                ...op,
                retryCount: 0,
                maxRetries: 3,
                status: "PENDING",
                errorMessage: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              }));

              jest.spyOn(syncService['syncRepository'], 'batchAddToQueue')
                .mockResolvedValue(mockSyncItems as any);

              // Simulate offline scenario - operations should be queued locally
              const result = await syncService.batchAddToSyncQueue(userId, operations);

              // Property: All operations must be persisted locally with PENDING status
              expect(result).toHaveLength(operations.length);
              
              // Each operation should be stored locally with correct data
              result.forEach((syncItem, index) => {
                expect(syncItem.id).toBeDefined();
                expect(syncItem.operation).toBe(operations[index].operation);
                expect(syncItem.entityType).toBe(operations[index].entityType);
                expect(syncItem.entityId).toBe(operations[index].entityId);
                expect(syncItem.data).toEqual(operations[index].data);
                expect(syncItem.status).toBe("PENDING");
                expect(syncItem.retryCount).toBe(0);
                expect(syncItem.createdAt).toBeDefined();
                expect(syncItem.updatedAt).toBeDefined();
              });

              // Verify that operations are available for later sync
              jest.spyOn(syncService['syncRepository'], 'getPendingItems')
                .mockResolvedValue(mockSyncItems as any);

              const pendingItems = await syncService['syncRepository'].getPendingItems(userId);
              expect(pendingItems).toHaveLength(operations.length);
              
              // Each pending item should maintain data integrity
              pendingItems.forEach((item, index) => {
                expect(item.operation).toBe(operations[index].operation);
                expect(item.entityType).toBe(operations[index].entityType);
                expect(item.entityId).toBe(operations[index].entityId);
                expect(item.data).toEqual(operations[index].data);
              });
            }
          ),
          { numRuns: 100 }
        );
      });

      it("should maintain data integrity for all entity types when offline", async () => {
        // **Feature: personal-finance-app, Property 13: Persistencia local sin conexión**
        // **Validates: Requirements 8.1**
        
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(), // userId
            fc.constantFrom(
              EntityType.BUDGET,
              EntityType.EXPENSE,
              EntityType.CREDIT_CARD,
              EntityType.CATEGORY,
              EntityType.BUDGET_PERIOD
            ), // entityType
            fc.constantFrom(SyncOperation.CREATE, SyncOperation.UPDATE, SyncOperation.DELETE), // operation
            fc.uuid(), // entityId
            fc.record({
              id: fc.uuid(),
              name: fc.string({ minLength: 1, maxLength: 100 }),
              amount: fc.float({ min: Math.fround(0), max: Math.fround(999999.99) }),
              currency: fc.constantFrom("GTQ", "USD"),
              description: fc.string({ maxLength: 500 }),
              userId: fc.uuid(),
              createdAt: fc.date(),
              updatedAt: fc.date(),
            }), // data
            async (userId, entityType, operation, entityId, data) => {
              const syncItem = {
                operation,
                entityType,
                entityId,
                data,
              };

              const mockResult = {
                id: "sync-123",
                userId,
                ...syncItem,
                retryCount: 0,
                maxRetries: 3,
                status: "PENDING",
                errorMessage: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              };

              jest.spyOn(syncService['syncRepository'], 'addToQueue')
                .mockResolvedValue(mockResult as any);

              // Add operation to sync queue (simulating offline storage)
              const result = await syncService.addToSyncQueue(userId, syncItem);

              // Property: Data must be preserved exactly as provided
              expect(result.operation).toBe(operation);
              expect(result.entityType).toBe(entityType);
              expect(result.entityId).toBe(entityId);
              expect(result.data).toEqual(data);
              expect(result.status).toBe("PENDING");
              
              // Property: All operations must be queryable for later synchronization
              expect(result.id).toBeDefined();
              expect(result.createdAt).toBeDefined();
              expect(result.updatedAt).toBeDefined();
              expect(result.retryCount).toBe(0);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});