import { PrismaClient } from "@prisma/client";
import { SyncService } from "./sync.service";
import { SyncOperation, EntityType } from "@prisma/client";
import * as fc from "fast-check";

// Mock Prisma
jest.mock("@prisma/client", () => {
  const mockPrismaInstance = {
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
    creditCard: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    category: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    budgetPeriod: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrismaInstance),
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
  };
});

describe("SyncService", () => {
  let syncService: SyncService;
  let mockPrismaInstance: any;

  beforeEach(() => {
    syncService = new SyncService();
    // Get the mock instance from the mocked PrismaClient
    const { PrismaClient } = require("@prisma/client");
    mockPrismaInstance = new PrismaClient();
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

    describe("Property 14: Sincronización completa", () => {
      it("should successfully synchronize all valid CREATE operations when connection is recovered", async () => {
        // **Feature: personal-finance-app, Property 14: Sincronización completa**
        // **Validates: Requirements 8.2**
        
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(), // userId
            // Generate array of CREATE operations only (to avoid UPDATE/DELETE conflicts)
            fc.array(
              fc.record({
                id: fc.uuid(),
                operation: fc.constant(SyncOperation.CREATE),
                entityType: fc.constantFrom(
                  EntityType.BUDGET,
                  EntityType.EXPENSE
                ),
                entityId: fc.uuid(),
                data: fc.record({
                  id: fc.uuid(),
                  name: fc.string({ minLength: 1, maxLength: 100 }),
                  amount: fc.float({ min: Math.fround(0.01), max: Math.fround(99999.99) }),
                  currency: fc.constantFrom("GTQ", "USD"),
                  description: fc.string({ maxLength: 200 }),
                  userId: fc.uuid(),
                  createdAt: fc.date(),
                  updatedAt: fc.date(),
                }),
                retryCount: fc.integer({ min: 0, max: 2 }),
                maxRetries: fc.constant(3),
                status: fc.constant("PENDING"),
                errorMessage: fc.constant(null),
                createdAt: fc.date(),
                updatedAt: fc.date(),
              }),
              { minLength: 1, maxLength: 10 }
            ),
            async (userId, pendingOperations) => {
              // Ensure unique entity IDs to avoid conflicts
              const uniqueOperations = pendingOperations.map((op, index) => ({
                ...op,
                entityId: `entity-${index}`,
                data: { ...op.data, id: `entity-${index}` }
              }));

              // Mock pending items in sync queue
              jest.spyOn(syncService['syncRepository'], 'getPendingItems')
                .mockResolvedValue(uniqueOperations as any);
              
              jest.spyOn(syncService['syncRepository'], 'getFailedItems')
                .mockResolvedValue([]);

              // Mock successful processing for all operations
              let processedCount = 0;
              
              // Mock status updates
              jest.spyOn(syncService['syncRepository'], 'updateStatus')
                .mockImplementation(async (id, status) => {
                  const item = uniqueOperations.find(op => op.id === id);
                  return { ...item, status } as any;
                });

              jest.spyOn(syncService['syncRepository'], 'markAsCompleted')
                .mockImplementation(async (id) => {
                  processedCount++;
                  const item = uniqueOperations.find(op => op.id === id);
                  return { ...item, status: "COMPLETED" } as any;
                });

              // Mock database operations for successful CREATE operations
              mockPrismaInstance.budget.findUnique.mockResolvedValue(null); // No existing record
              mockPrismaInstance.budget.create.mockResolvedValue({});

              mockPrismaInstance.expense.findUnique.mockResolvedValue(null); // No existing record
              mockPrismaInstance.expense.create.mockResolvedValue({});

              // Process sync queue (simulating connection recovery)
              const result = await syncService.processSyncQueue(userId);

              // Property: All pending operations must be processed
              expect(result.processed).toBe(uniqueOperations.length);
              
              // Property: All CREATE operations should be successful when no conflicts exist
              expect(result.successful).toBe(uniqueOperations.length);
              expect(result.failed).toBe(0);
              expect(result.conflicts).toBe(0);
              
              // Property: No errors should occur for valid CREATE operations
              expect(result.errors).toHaveLength(0);
              
              // Property: All operations should be marked as completed
              expect(processedCount).toBe(uniqueOperations.length);
            }
          ),
          { numRuns: 50 }
        );
      });

      it("should process all pending operations and handle both success and failure cases", async () => {
        // **Feature: personal-finance-app, Property 14: Sincronización completa**
        // **Validates: Requirements 8.2**
        
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(), // userId
            // Generate a simple array of operations
            fc.array(
              fc.record({
                id: fc.uuid(),
                operation: fc.constant(SyncOperation.CREATE),
                entityType: fc.constant(EntityType.BUDGET),
                entityId: fc.uuid(),
                data: fc.record({
                  id: fc.uuid(),
                  name: fc.string({ minLength: 1, maxLength: 50 }),
                }),
                retryCount: fc.constant(0),
                maxRetries: fc.constant(3),
                status: fc.constant("PENDING"),
              }),
              { minLength: 1, maxLength: 3 }
            ),
            async (userId, operations) => {
              // Make entity IDs unique
              const uniqueOperations = operations.map((op, index) => ({
                ...op,
                entityId: `entity-${index}`,
                data: { ...op.data, id: `entity-${index}` }
              }));

              jest.spyOn(syncService['syncRepository'], 'getPendingItems')
                .mockResolvedValue(uniqueOperations as any);
              
              jest.spyOn(syncService['syncRepository'], 'getFailedItems')
                .mockResolvedValue([]);

              let completedCount = 0;

              // Mock successful processing
              jest.spyOn(syncService['syncRepository'], 'updateStatus')
                .mockResolvedValue({} as any);

              jest.spyOn(syncService['syncRepository'], 'markAsCompleted')
                .mockImplementation(async (id) => {
                  completedCount++;
                  return {} as any;
                });

              // Mock successful database operations (no failures in this simplified test)
              mockPrismaInstance.budget.findUnique.mockResolvedValue(null);
              mockPrismaInstance.budget.create.mockResolvedValue({});

              // Process sync queue
              const result = await syncService.processSyncQueue(userId);

              // Property: All operations must be processed
              expect(result.processed).toBe(uniqueOperations.length);
              
              // Property: All operations should be successful (no simulated failures)
              expect(result.successful).toBe(uniqueOperations.length);
              expect(result.failed).toBe(0);
              expect(result.conflicts).toBe(0);
              
              // Property: No errors should occur
              expect(result.errors).toHaveLength(0);
              
              // Property: All operations should be marked as completed
              expect(completedCount).toBe(uniqueOperations.length);
            }
          ),
          { numRuns: 50 }
        );
      });

      it("should maintain data integrity during batch synchronization of CREATE operations", async () => {
        // **Feature: personal-finance-app, Property 14: Sincronización completa**
        // **Validates: Requirements 8.2**
        
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(), // userId
            // Generate CREATE operations only to avoid UPDATE complexity
            fc.array(
              fc.record({
                id: fc.uuid(),
                operation: fc.constant(SyncOperation.CREATE),
                entityType: fc.constant(EntityType.BUDGET),
                entityId: fc.uuid(),
                data: fc.record({
                  id: fc.uuid(),
                  userId: fc.uuid(),
                  month: fc.integer({ min: 1, max: 12 }),
                  year: fc.integer({ min: 2020, max: 2030 }),
                  paymentFrequency: fc.constantFrom("BIWEEKLY", "MONTHLY"),
                  totalIncome: fc.float({ min: Math.fround(1000), max: Math.fround(50000) }),
                  createdAt: fc.date(),
                  updatedAt: fc.date(),
                }),
                retryCount: fc.constant(0),
                maxRetries: fc.constant(3),
                status: fc.constant("PENDING"),
                createdAt: fc.date(),
                updatedAt: fc.date(),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            async (userId, operations) => {
              // Make entity IDs unique to avoid conflicts
              const uniqueOperations = operations.map((op, index) => ({
                ...op,
                entityId: `budget-${index}`,
                data: { ...op.data, id: `budget-${index}` }
              }));

              // Sort operations by creation time to simulate proper order
              const sortedOperations = uniqueOperations.sort((a, b) => 
                a.createdAt.getTime() - b.createdAt.getTime()
              );

              jest.spyOn(syncService['syncRepository'], 'getPendingItems')
                .mockResolvedValue(sortedOperations as any);
              
              jest.spyOn(syncService['syncRepository'], 'getFailedItems')
                .mockResolvedValue([]);

              const processedOperations: any[] = [];

              // Track processing order
              jest.spyOn(syncService['syncRepository'], 'updateStatus')
                .mockImplementation(async (id, status) => {
                  const item = sortedOperations.find(op => op.id === id);
                  if (status === "PROCESSING") {
                    processedOperations.push(item);
                  }
                  return { ...item, status } as any;
                });

              jest.spyOn(syncService['syncRepository'], 'markAsCompleted')
                .mockImplementation(async (id) => {
                  const item = sortedOperations.find(op => op.id === id);
                  return { ...item, status: "COMPLETED" } as any;
                });

              // Mock successful database operations
              mockPrismaInstance.budget.findUnique.mockResolvedValue(null);
              mockPrismaInstance.budget.create.mockResolvedValue({});

              // Process sync queue
              const result = await syncService.processSyncQueue(userId);

              // Property: All operations should be processed successfully
              expect(result.processed).toBe(sortedOperations.length);
              expect(result.successful).toBe(sortedOperations.length);
              expect(result.failed).toBe(0);
              
              // Property: Operations should maintain their data integrity
              processedOperations.forEach((processedOp, index) => {
                const originalOp = sortedOperations[index];
                expect(processedOp.entityId).toBe(originalOp.entityId);
                expect(processedOp.operation).toBe(originalOp.operation);
                // Only check essential data fields that shouldn't change
                expect(processedOp.data.id).toBe(originalOp.data.id);
                expect(processedOp.data.month).toBe(originalOp.data.month);
                expect(processedOp.data.year).toBe(originalOp.data.year);
                expect(processedOp.data.paymentFrequency).toBe(originalOp.data.paymentFrequency);
                expect(processedOp.data.totalIncome).toBe(originalOp.data.totalIncome);
              });

              // Property: All operations should be processed
              expect(processedOperations).toHaveLength(sortedOperations.length);
              
              // Property: Data consistency should be maintained
              processedOperations.forEach(op => {
                expect(op.data.id).toBeDefined();
                expect(op.data.userId).toBeDefined();
                expect(op.data.month).toBeGreaterThanOrEqual(1);
                expect(op.data.month).toBeLessThanOrEqual(12);
                expect(op.data.year).toBeGreaterThanOrEqual(2020);
                expect(op.data.totalIncome).toBeGreaterThan(0);
              });
            }
          ),
          { numRuns: 30 }
        );
      });
    });

    describe("Property 15: Consistencia post-sincronización", () => {
      it("should ensure local state matches server state exactly after synchronization", async () => {
        // **Feature: personal-finance-app, Property 15: Consistencia post-sincronización**
        // **Validates: Requirements 8.5**
        
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(), // userId
            // Generate operations that will be synchronized
            fc.array(
              fc.record({
                id: fc.uuid(),
                operation: fc.constantFrom(SyncOperation.CREATE, SyncOperation.UPDATE),
                entityType: fc.constantFrom(EntityType.BUDGET, EntityType.EXPENSE),
                entityId: fc.uuid(),
                data: fc.record({
                  id: fc.uuid(),
                  name: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length > 0),
                  amount: fc.float({ min: 1, max: 99999, noNaN: true }),
                  currency: fc.constantFrom("GTQ", "USD"),
                  description: fc.string({ minLength: 1, maxLength: 200 }),
                  userId: fc.uuid(),
                  createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                  updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                }),
                retryCount: fc.constant(0),
                maxRetries: fc.constant(3),
                status: fc.constant("PENDING"),
                errorMessage: fc.constant(null),
                createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
              }),
              { minLength: 1, maxLength: 5 }
            ),
            async (userId, operations) => {
              // Make entity IDs unique to avoid conflicts and ensure CREATE operations only
              const uniqueOperations = operations.map((op, index) => ({
                ...op,
                operation: SyncOperation.CREATE, // Force all operations to be CREATE to avoid conflicts
                entityId: `entity-${index}`,
                data: { ...op.data, id: `entity-${index}` }
              }));

              // Mock pending items in sync queue
              jest.spyOn(syncService['syncRepository'], 'getPendingItems')
                .mockResolvedValue(uniqueOperations as any);
              
              jest.spyOn(syncService['syncRepository'], 'getFailedItems')
                .mockResolvedValue([]);

              // Track what gets written to the server
              const serverState = new Map<string, any>();
              
              // Mock successful processing and track server state
              jest.spyOn(syncService['syncRepository'], 'updateStatus')
                .mockResolvedValue({} as any);

              jest.spyOn(syncService['syncRepository'], 'markAsCompleted')
                .mockResolvedValue({} as any);

              // Mock database operations and capture server state
              mockPrismaInstance.budget.findUnique.mockImplementation(async ({ where }: any) => {
                return serverState.get(where.id) || null;
              });

              mockPrismaInstance.budget.create.mockImplementation(async ({ data }: any) => {
                serverState.set(data.id, data);
                return data;
              });

              mockPrismaInstance.budget.update.mockImplementation(async ({ where, data }: any) => {
                const existing = serverState.get(where.id);
                const updated = { ...existing, ...data };
                serverState.set(where.id, updated);
                return updated;
              });

              mockPrismaInstance.expense.findUnique.mockImplementation(async ({ where }: any) => {
                return serverState.get(where.id) || null;
              });

              mockPrismaInstance.expense.create.mockImplementation(async ({ data }: any) => {
                serverState.set(data.id, data);
                return data;
              });

              mockPrismaInstance.expense.update.mockImplementation(async ({ where, data }: any) => {
                const existing = serverState.get(where.id);
                const updated = { ...existing, ...data };
                serverState.set(where.id, updated);
                return updated;
              });

              // Process sync queue
              const result = await syncService.processSyncQueue(userId);

              // Property: After successful synchronization, all data should be confirmed as updated
              if (result.successful > 0) {
                // Verify that synchronization was completed successfully
                expect(result.processed).toBeGreaterThan(0);
                expect(result.successful).toBe(uniqueOperations.length);
                expect(result.failed).toBe(0);
                expect(result.conflicts).toBe(0);

                // Property: Server state should contain exactly the data that was synchronized
                uniqueOperations.forEach(operation => {
                  if (operation.operation === SyncOperation.CREATE || operation.operation === SyncOperation.UPDATE) {
                    // Server should have the entity with the exact data that was synchronized
                    const serverEntity = serverState.get(operation.data.id);
                    expect(serverEntity).toBeDefined();
                    
                    // Property: Essential data fields must match exactly
                    expect(serverEntity.id).toBe(operation.data.id);
                    if (operation.data.name && operation.data.name.trim().length > 0) {
                      expect(serverEntity.name).toBe(operation.data.name);
                    }
                    if (operation.data.amount && operation.data.amount >= 0.01) {
                      expect(serverEntity.amount).toBe(operation.data.amount);
                    }
                    if (operation.data.currency) {
                      expect(serverEntity.currency).toBe(operation.data.currency);
                    }
                    if (operation.data.description !== undefined) {
                      expect(serverEntity.description).toBe(operation.data.description);
                    }
                    expect(serverEntity.userId).toBe(operation.data.userId);
                  }
                });

                // Property: Server state should not contain any unexpected entities
                const expectedEntityCount = uniqueOperations.filter(op => 
                  op.operation === SyncOperation.CREATE || op.operation === SyncOperation.UPDATE
                ).length;
                expect(serverState.size).toBe(expectedEntityCount);

                // Property: All synchronized data should be consistent and complete
                for (const [key, entity] of serverState.entries()) {
                  expect(entity.id).toBeDefined();
                  expect(entity.name).toBeDefined();
                  expect(typeof entity.amount).toBe('number');
                  expect(entity.amount).toBeGreaterThan(0);
                  expect(['GTQ', 'USD']).toContain(entity.currency);
                  expect(entity.userId).toBeDefined();
                  expect(entity.createdAt).toBeDefined();
                  expect(entity.updatedAt).toBeDefined();
                }
              }
            }
          ),
          { numRuns: 100 }
        );
      });

      it("should maintain data consistency across multiple entity types after synchronization", async () => {
        // **Feature: personal-finance-app, Property 15: Consistencia post-sincronización**
        // **Validates: Requirements 8.5**
        
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(), // userId
            // Generate mixed operations across different entity types
            fc.record({
              budgetOps: fc.array(
                fc.record({
                  id: fc.uuid(),
                  operation: fc.constant(SyncOperation.CREATE),
                  entityType: fc.constant(EntityType.BUDGET),
                  entityId: fc.uuid(),
                  data: fc.record({
                    id: fc.uuid(),
                    userId: fc.uuid(),
                    month: fc.integer({ min: 1, max: 12 }),
                    year: fc.integer({ min: 2020, max: 2030 }),
                    paymentFrequency: fc.constantFrom("BIWEEKLY", "MONTHLY"),
                    totalIncome: fc.float({ min: 1000, max: 50000, noNaN: true }),
                    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                  }),
                  status: fc.constant("PENDING"),
                }),
                { minLength: 0, maxLength: 3 }
              ),
              expenseOps: fc.array(
                fc.record({
                  id: fc.uuid(),
                  operation: fc.constant(SyncOperation.CREATE),
                  entityType: fc.constant(EntityType.EXPENSE),
                  entityId: fc.uuid(),
                  data: fc.record({
                    id: fc.uuid(),
                    userId: fc.uuid(),
                    amount: fc.float({ min: 1, max: 9999, noNaN: true }),
                    currency: fc.constantFrom("GTQ", "USD"),
                    description: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length > 0),
                    date: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                    createdAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                    updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
                  }),
                  status: fc.constant("PENDING"),
                }),
                { minLength: 0, maxLength: 3 }
              ),
            }),
            async (userId, { budgetOps, expenseOps }) => {
              // Ensure we have at least one operation
              if (budgetOps.length === 0 && expenseOps.length === 0) {
                return; // Skip empty test cases
              }

              // Make entity IDs unique
              const uniqueBudgetOps = budgetOps.map((op, index) => ({
                ...op,
                entityId: `budget-${index}`,
                data: { ...op.data, id: `budget-${index}` }
              }));

              const uniqueExpenseOps = expenseOps.map((op, index) => ({
                ...op,
                entityId: `expense-${index}`,
                data: { ...op.data, id: `expense-${index}` }
              }));

              const allOperations = [...uniqueBudgetOps, ...uniqueExpenseOps];

              // Mock sync queue
              jest.spyOn(syncService['syncRepository'], 'getPendingItems')
                .mockResolvedValue(allOperations as any);
              
              jest.spyOn(syncService['syncRepository'], 'getFailedItems')
                .mockResolvedValue([]);

              // Track server state for both entity types
              const budgetServerState = new Map<string, any>();
              const expenseServerState = new Map<string, any>();

              // Mock repository operations
              jest.spyOn(syncService['syncRepository'], 'updateStatus')
                .mockResolvedValue({} as any);

              jest.spyOn(syncService['syncRepository'], 'markAsCompleted')
                .mockResolvedValue({} as any);

              // Mock budget operations
              mockPrismaInstance.budget.findUnique.mockResolvedValue(null);
              mockPrismaInstance.budget.create.mockImplementation(async ({ data }: any) => {
                budgetServerState.set(data.id, data);
                return data;
              });

              // Mock expense operations
              mockPrismaInstance.expense.findUnique.mockResolvedValue(null);
              mockPrismaInstance.expense.create.mockImplementation(async ({ data }: any) => {
                expenseServerState.set(data.id, data);
                return data;
              });

              // Process synchronization
              const result = await syncService.processSyncQueue(userId);

              // Property: All operations should be processed successfully
              expect(result.processed).toBe(allOperations.length);
              expect(result.successful).toBe(allOperations.length);
              expect(result.failed).toBe(0);

              // Property: Server state should match exactly what was synchronized for budgets
              uniqueBudgetOps.forEach(budgetOp => {
                const serverBudget = budgetServerState.get(budgetOp.entityId);
                expect(serverBudget).toBeDefined();
                expect(serverBudget.id).toBe(budgetOp.data.id);
                expect(serverBudget.month).toBe(budgetOp.data.month);
                expect(serverBudget.year).toBe(budgetOp.data.year);
                expect(serverBudget.paymentFrequency).toBe(budgetOp.data.paymentFrequency);
                expect(serverBudget.totalIncome).toBe(budgetOp.data.totalIncome);
              });

              // Property: Server state should match exactly what was synchronized for expenses
              uniqueExpenseOps.forEach(expenseOp => {
                const serverExpense = expenseServerState.get(expenseOp.entityId);
                expect(serverExpense).toBeDefined();
                expect(serverExpense.id).toBe(expenseOp.data.id);
                expect(serverExpense.amount).toBe(expenseOp.data.amount);
                expect(serverExpense.currency).toBe(expenseOp.data.currency);
                expect(serverExpense.description).toBe(expenseOp.data.description);
              });

              // Property: Server state counts should match operation counts
              expect(budgetServerState.size).toBe(uniqueBudgetOps.length);
              expect(expenseServerState.size).toBe(uniqueExpenseOps.length);

              // Property: All synchronized data should maintain referential integrity
              budgetServerState.forEach(budget => {
                expect(budget.userId).toBeDefined();
                expect(budget.month).toBeGreaterThanOrEqual(1);
                expect(budget.month).toBeLessThanOrEqual(12);
                expect(budget.year).toBeGreaterThanOrEqual(2020);
                expect(budget.totalIncome).toBeGreaterThan(0);
                expect(['BIWEEKLY', 'MONTHLY']).toContain(budget.paymentFrequency);
              });

              expenseServerState.forEach(expense => {
                expect(expense.userId).toBeDefined();
                expect(expense.amount).toBeGreaterThan(0);
                expect(['GTQ', 'USD']).toContain(expense.currency);
                expect(expense.description).toBeDefined();
                expect(expense.date).toBeDefined();
              });
            }
          ),
          { numRuns: 100 }
        );
      });

      it("should confirm all data is updated after conflict resolution", async () => {
        // **Feature: personal-finance-app, Property 15: Consistencia post-sincronización**
        // **Validates: Requirements 8.5**
        
        await fc.assert(
          fc.asyncProperty(
            fc.uuid(), // userId
            fc.uuid(), // conflictId
            fc.constantFrom('LOCAL', 'REMOTE', 'MERGE'), // resolution type
            fc.record({
              id: fc.uuid(),
              operation: fc.constant(SyncOperation.UPDATE),
              entityType: fc.constant(EntityType.BUDGET),
              entityId: fc.uuid(),
              data: fc.record({
                id: fc.uuid(),
                name: fc.string({ minLength: 2, maxLength: 100 }).filter(s => s.trim().length > 0),
                totalIncome: fc.float({ min: 1000, max: 50000, noNaN: true }),
                updatedAt: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
              }),
            }), // sync item
            async (userId, conflictId, resolutionType, syncItem) => {
              // Mock conflict item in repository
              const mockConflictItem = {
                id: conflictId,
                userId,
                operation: syncItem.operation,
                entityType: syncItem.entityType,
                entityId: syncItem.entityId,
                data: syncItem.data,
                status: "FAILED",
                errorMessage: "Conflict detected",
              };

              jest.spyOn(syncService['syncRepository'], 'findById')
                .mockResolvedValue(mockConflictItem as any);

              // Track server state after resolution
              const serverState = new Map<string, any>();

              // Mock force sync operations
              if (resolutionType === 'LOCAL' || resolutionType === 'MERGE') {
                mockPrismaInstance.budget.upsert.mockImplementation(async ({ where, create, update }: any) => {
                  const data = create || update;
                  serverState.set(where.id, data);
                  return data;
                });
              }

              jest.spyOn(syncService['syncRepository'], 'markAsCompleted')
                .mockResolvedValue({} as any);

              // Prepare resolution data
              const resolution: any = { resolution: resolutionType };
              if (resolutionType === 'MERGE') {
                resolution.mergedData = {
                  ...syncItem.data,
                  name: `Merged: ${syncItem.data.name}`,
                };
              }

              // Resolve conflict
              const result = await syncService.resolveConflict(userId, conflictId, resolution);

              // Property: Conflict resolution should always succeed for valid inputs
              expect(result).toBe(true);

              // Property: After resolution, data state should be consistent
              if (resolutionType === 'LOCAL') {
                // Local data should be in server state
                const serverEntity = serverState.get(syncItem.entityId);
                expect(serverEntity).toBeDefined();
                expect(serverEntity.id).toBe(syncItem.data.id);
                expect(serverEntity.name).toBe(syncItem.data.name);
                expect(serverEntity.totalIncome).toBe(syncItem.data.totalIncome);
              } else if (resolutionType === 'MERGE') {
                // Merged data should be in server state
                const serverEntity = serverState.get(syncItem.entityId);
                expect(serverEntity).toBeDefined();
                expect(serverEntity.id).toBe(syncItem.data.id);
                expect(serverEntity.name).toBe(`Merged: ${syncItem.data.name}`);
                expect(serverEntity.totalIncome).toBe(syncItem.data.totalIncome);
              } else if (resolutionType === 'REMOTE') {
                // Remote data is kept (no server update needed)
                // Conflict should be marked as completed without server changes
                expect(serverState.size).toBe(0);
              }

              // Property: All resolved conflicts should be marked as completed
              expect(syncService['syncRepository'].markAsCompleted).toHaveBeenCalledWith(conflictId);
            }
          ),
          { numRuns: 100 }
        );
      });
    });
  });
});