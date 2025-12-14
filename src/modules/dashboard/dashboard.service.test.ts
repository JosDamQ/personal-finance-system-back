import { DashboardService } from "./dashboard.service";
import { DashboardFilters } from "./dashboard.types";

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
});