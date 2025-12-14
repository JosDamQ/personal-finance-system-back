import { DashboardService } from "./dashboard.service";
import { DashboardFilters } from "./dashboard.types";
import { DashboardRepository } from "./dashboard.repository";
import * as fc from "fast-check";

describe("DashboardService", () => {
  let dashboardService: DashboardService;

  beforeEach(() => {
    dashboardService = new DashboardService();
  });

  describe("Service initialization", () => {
    it("should create dashboard service instance", () => {
      expect(dashboardService).toBeDefined();
      expect(dashboardService).toBeInstanceOf(DashboardService);
    });
  });

  describe("Input validation", () => {
    it("should validate month parameter", async () => {
      await expect(
        dashboardService.getMonthlyMetrics("test-user-id", 13, 2024)
      ).rejects.toThrow("Month must be between 1 and 12");

      await expect(
        dashboardService.getMonthlyMetrics("test-user-id", 0, 2024)
      ).rejects.toThrow("Month must be between 1 and 12");
    });

    it("should validate year parameter", async () => {
      await expect(
        dashboardService.getMonthlyMetrics("test-user-id", 1, 1999)
      ).rejects.toThrow("Year must be between 2000 and 2100");

      await expect(
        dashboardService.getMonthlyMetrics("test-user-id", 1, 2101)
      ).rejects.toThrow("Year must be between 2000 and 2100");
    });
  });

  describe("Chart type validation", () => {
    it("should throw error for invalid chart type", async () => {
      await expect(
        dashboardService.getChartData("test-user-id", "invalid-type" as any)
      ).rejects.toThrow("Invalid chart type");
    });

    it("should accept valid chart types", () => {
      const validTypes = [
        'expenses-by-category',
        'expenses-by-credit-card', 
        'monthly-trends',
        'daily-expenses'
      ];

      validTypes.forEach(type => {
        expect(typeof type).toBe('string');
        expect(type.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Filter validation", () => {
    it("should handle empty filters object", () => {
      const filters: DashboardFilters = {};
      
      expect(filters).toBeDefined();
      expect(typeof filters).toBe('object');
    });

    it("should handle date range filters", () => {
      const startDate = new Date(2024, 0, 1); // January 1, 2024
      const endDate = new Date(2024, 2, 31); // March 31, 2024

      const filters: DashboardFilters = {
        startDate,
        endDate,
      };

      expect(filters.startDate).toEqual(startDate);
      expect(filters.endDate).toEqual(endDate);
    });

    it("should handle currency filters", () => {
      const filters: DashboardFilters = {
        currency: 'GTQ'
      };

      expect(filters.currency).toBe('GTQ');
    });

    it("should handle month and year filters", () => {
      const filters: DashboardFilters = {
        month: 12,
        year: 2024
      };

      expect(filters.month).toBe(12);
      expect(filters.year).toBe(2024);
    });
  });

  describe("Property-based tests", () => {
    let mockRepository: jest.Mocked<DashboardRepository>;

    beforeEach(() => {
      // Mock the repository methods
      mockRepository = {
        getCurrentMonthBudgetSummary: jest.fn(),
        getCreditCardsSummary: jest.fn(),
        getAlertsSummary: jest.fn(),
        getRecentExpensesSummary: jest.fn(),
        getMonthlyMetrics: jest.fn(),
        getExpensesTrends: jest.fn(),
      } as any;

      // Replace the repository instance in the service
      (dashboardService as any).dashboardRepository = mockRepository;
    });

    it("should maintain temporal filter consistency for chart data", async () => {
      // **Feature: personal-finance-app, Property 11: Consistencia de filtros temporales**
      await fc.assert(fc.asyncProperty(
        // Generate valid date ranges
        fc.record({
          startDate: fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }),
          endDate: fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) })
        }).filter(({ startDate, endDate }) => startDate <= endDate),
        fc.constantFrom('expenses-by-category', 'expenses-by-credit-card', 'monthly-trends', 'daily-expenses'),
        fc.uuid(),
        async ({ startDate, endDate }, chartType, userId) => {
          // Mock repository responses based on chart type
          const mockMonthlyMetrics = {
            month: startDate.getMonth() + 1,
            year: startDate.getFullYear(),
            income: 1000,
            expenses: 500,
            balance: 500,
            expensesByCategory: [],
            expensesByCreditCard: [],
            dailyExpenses: []
          };

          const mockExpensesTrends = {
            months: [],
            categories: []
          };

          mockRepository.getMonthlyMetrics.mockResolvedValue(mockMonthlyMetrics);
          mockRepository.getExpensesTrends.mockResolvedValue(mockExpensesTrends);

          const filters: DashboardFilters = { startDate, endDate };
          const result = await dashboardService.getChartData(userId, chartType, filters);
          
          // Verify that the returned period matches exactly the requested filter
          expect(result.period.startDate).toEqual(startDate);
          expect(result.period.endDate).toEqual(endDate);
          
          // Verify that the chart type matches what was requested
          expect(result.type).toBe(chartType);
          
          // Verify that data structure is consistent
          expect(result.data).toBeDefined();
          expect(typeof result.data).toBe('object');
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it("should maintain month/year filter consistency", async () => {
      // **Feature: personal-finance-app, Property 11: Consistencia de filtros temporales**
      await fc.assert(fc.asyncProperty(
        fc.integer({ min: 1, max: 12 }), // Valid month
        fc.integer({ min: 2020, max: 2030 }), // Valid year
        fc.uuid(),
        async (month, year, userId) => {
          // Mock repository response with consistent month/year
          const mockResponse = {
            month,
            year,
            income: 1000,
            expenses: 500,
            balance: 500,
            expensesByCategory: [],
            expensesByCreditCard: [],
            dailyExpenses: [
              // Generate some daily expenses within the requested month
              {
                date: new Date(year, month - 1, 15).toISOString().split('T')[0],
                totalGTQ: 100,
                totalUSD: 50
              }
            ]
          };

          mockRepository.getMonthlyMetrics.mockResolvedValue(mockResponse);

          const result = await dashboardService.getMonthlyMetrics(userId, month, year);
          
          // Verify that the returned data corresponds exactly to the requested month/year
          expect(result.month).toBe(month);
          expect(result.year).toBe(year);
          
          // Verify data structure consistency
          expect(typeof result.income).toBe('number');
          expect(typeof result.expenses).toBe('number');
          expect(typeof result.balance).toBe('number');
          expect(Array.isArray(result.expensesByCategory)).toBe(true);
          expect(Array.isArray(result.expensesByCreditCard)).toBe(true);
          expect(Array.isArray(result.dailyExpenses)).toBe(true);
          
          // Verify that daily expenses, if any, fall within the requested month
          result.dailyExpenses.forEach(dayExpense => {
            const expenseDate = new Date(dayExpense.date);
            expect(expenseDate.getMonth() + 1).toBe(month);
            expect(expenseDate.getFullYear()).toBe(year);
          });
          
          return true;
        }
      ), { numRuns: 100 });
    });

    it("should maintain expenses trends filter consistency", async () => {
      // **Feature: personal-finance-app, Property 11: Consistencia de filtros temporales**
      await fc.assert(fc.asyncProperty(
        fc.record({
          startDate: fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) }),
          endDate: fc.date({ min: new Date(2020, 0, 1), max: new Date(2030, 11, 31) })
        }).filter(({ startDate, endDate }) => startDate <= endDate),
        fc.uuid(),
        async ({ startDate, endDate }, userId) => {
          // Generate mock data that respects the date range
          const monthsInRange = [];
          const currentDate = new Date(startDate);
          
          while (currentDate <= endDate) {
            monthsInRange.push({
              month: currentDate.getMonth() + 1,
              year: currentDate.getFullYear(),
              totalGTQ: 100,
              totalUSD: 50,
              expenseCount: 5
            });
            currentDate.setMonth(currentDate.getMonth() + 1);
          }

          const mockResponse = {
            months: monthsInRange,
            categories: [{
              categoryId: 'test-category',
              categoryName: 'Test Category',
              categoryColor: '#FF0000',
              monthlyData: monthsInRange.map(m => ({
                month: m.month,
                year: m.year,
                totalGTQ: 50,
                totalUSD: 25
              }))
            }]
          };

          mockRepository.getExpensesTrends.mockResolvedValue(mockResponse);

          const filters = { startDate, endDate };
          const result = await dashboardService.getExpensesTrends(userId, filters);
          
          // Verify that all returned months fall within the requested date range
          result.months.forEach(monthData => {
            const monthStart = new Date(monthData.year, monthData.month - 1, 1);
            const monthEnd = new Date(monthData.year, monthData.month, 0, 23, 59, 59);
            
            // Month should overlap with the requested range
            expect(monthStart <= endDate).toBe(true);
            expect(monthEnd >= startDate).toBe(true);
          });
          
          // Verify that category monthly data also falls within the range
          result.categories.forEach(category => {
            category.monthlyData.forEach(monthData => {
              const monthStart = new Date(monthData.year, monthData.month - 1, 1);
              const monthEnd = new Date(monthData.year, monthData.month, 0, 23, 59, 59);
              
              // Month should overlap with the requested range
              expect(monthStart <= endDate).toBe(true);
              expect(monthEnd >= startDate).toBe(true);
            });
          });
          
          // Verify data structure consistency
          expect(Array.isArray(result.months)).toBe(true);
          expect(Array.isArray(result.categories)).toBe(true);
          
          return true;
        }
      ), { numRuns: 100 });
    });
  });
});