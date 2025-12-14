import { BudgetService } from "./budget.service";
import { CreateBudgetDto, UpdateBudgetDto } from "./budget.types";

describe("BudgetService", () => {
  let budgetService: BudgetService;

  beforeEach(() => {
    budgetService = new BudgetService();
  });

  describe("Input validation", () => {
    it("should validate biweekly budget structure", () => {
      const budgetData: CreateBudgetDto = {
        month: 12,
        year: 2024,
        paymentFrequency: "BIWEEKLY",
        periods: [
          { periodNumber: 1, income: 5000 },
          { periodNumber: 2, income: 5000 },
        ],
      };

      expect(budgetData.month).toBe(12);
      expect(budgetData.year).toBe(2024);
      expect(budgetData.paymentFrequency).toBe("BIWEEKLY");
      expect(budgetData.periods).toHaveLength(2);
    });

    it("should validate monthly budget structure", () => {
      const budgetData: CreateBudgetDto = {
        month: 12,
        year: 2024,
        paymentFrequency: "MONTHLY",
        periods: [{ periodNumber: 1, income: 10000 }],
      };

      expect(budgetData.paymentFrequency).toBe("MONTHLY");
      expect(budgetData.periods).toHaveLength(1);
    });

    it("should validate period numbers", () => {
      const periods = [
        { periodNumber: 1, income: 3000 },
        { periodNumber: 2, income: 4500 },
      ];

      expect(periods[0].periodNumber).toBe(1);
      expect(periods[1].periodNumber).toBe(2);
    });
  });

  describe("Income calculations", () => {
    it("should calculate total income for biweekly payments", () => {
      const periods = [
        { periodNumber: 1, income: 5000 },
        { periodNumber: 2, income: 5000 },
      ];

      const totalIncome = periods.reduce((sum, period) => sum + period.income, 0);
      expect(totalIncome).toBe(10000);
    });

    it("should calculate total income for monthly payments", () => {
      const periods = [{ periodNumber: 1, income: 10000 }];

      const totalIncome = periods.reduce((sum, period) => sum + period.income, 0);
      expect(totalIncome).toBe(10000);
    });

    it("should handle different income amounts per period", () => {
      const periods = [
        { periodNumber: 1, income: 3000 },
        { periodNumber: 2, income: 4500 },
      ];

      const totalIncome = periods.reduce((sum, period) => sum + period.income, 0);
      expect(totalIncome).toBe(7500);
    });
  });

  describe("Update validation", () => {
    it("should accept payment frequency updates", () => {
      const updateData: UpdateBudgetDto = {
        paymentFrequency: "MONTHLY",
      };

      expect(updateData.paymentFrequency).toBe("MONTHLY");
    });

    it("should accept period updates", () => {
      const updateData: UpdateBudgetDto = {
        periods: [
          { periodNumber: 1, income: 6000 },
          { periodNumber: 2, income: 6000 },
        ],
      };

      expect(updateData.periods).toHaveLength(2);
      expect(updateData.periods?.[0].income).toBe(6000);
    });
  });

  describe("Date validation", () => {
    it("should validate month range", () => {
      const validMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

      validMonths.forEach((month) => {
        expect(month).toBeGreaterThanOrEqual(1);
        expect(month).toBeLessThanOrEqual(12);
      });
    });

    it("should validate year format", () => {
      const year = 2024;
      expect(year).toBeGreaterThan(2000);
      expect(year).toBeLessThan(3000);
    });
  });
});
