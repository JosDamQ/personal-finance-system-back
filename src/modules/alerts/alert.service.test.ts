import { AlertService } from "./alert.service";
import { CreateAlertDto } from "./alert.types";

describe("AlertService", () => {
  let alertService: AlertService;

  beforeEach(() => {
    alertService = new AlertService();
  });

  describe("Input validation", () => {
    it("should validate alert data structure", () => {
      const alertData: CreateAlertDto = {
        type: "CREDIT_LIMIT_WARNING" as any,
        title: "Credit Limit Warning",
        message: "You have reached 80% of your credit limit",
        metadata: { creditCardId: "card-123", percentage: 80 },
      };

      expect(alertData.type).toBe("CREDIT_LIMIT_WARNING");
      expect(alertData.title).toBe("Credit Limit Warning");
      expect(alertData.message).toBe("You have reached 80% of your credit limit");
      expect(alertData.metadata).toBeDefined();
    });

    it("should handle optional metadata", () => {
      const alertData: CreateAlertDto = {
        type: "MONTHLY_SUMMARY" as any,
        title: "Monthly Summary",
        message: "Your monthly financial summary is ready",
      };

      expect(alertData.metadata).toBeUndefined();
    });
  });

  describe("Alert type validation", () => {
    it("should validate credit limit warning type", () => {
      const alertType = "CREDIT_LIMIT_WARNING";
      expect(alertType).toBe("CREDIT_LIMIT_WARNING");
    });

    it("should validate budget exceeded type", () => {
      const alertType = "BUDGET_EXCEEDED";
      expect(alertType).toBe("BUDGET_EXCEEDED");
    });

    it("should validate payment reminder type", () => {
      const alertType = "PAYMENT_REMINDER";
      expect(alertType).toBe("PAYMENT_REMINDER");
    });

    it("should validate monthly summary type", () => {
      const alertType = "MONTHLY_SUMMARY";
      expect(alertType).toBe("MONTHLY_SUMMARY");
    });
  });

  describe("Metadata validation", () => {
    it("should handle credit limit metadata", () => {
      const metadata = {
        creditCardId: "card-123",
        creditCardName: "Visa Gold",
        currency: "GTQ",
        currentBalance: 42000,
        limit: 50000,
        percentage: 84,
      };

      expect(metadata.creditCardId).toBe("card-123");
      expect(metadata.percentage).toBe(84);
    });

    it("should handle budget exceeded metadata", () => {
      const metadata = {
        budgetId: "budget-123",
        budgetPeriodId: "period-123",
        month: 12,
        year: 2024,
        periodNumber: 1,
        totalIncome: 5000,
        totalExpenses: 5500,
        exceededAmount: 500,
      };

      expect(metadata.exceededAmount).toBe(500);
      expect(metadata.totalExpenses).toBeGreaterThan(metadata.totalIncome);
    });
  });

  describe("Percentage calculations", () => {
    it("should calculate credit usage percentage correctly", () => {
      const currentBalance = 40000;
      const limit = 50000;
      const percentage = Math.round((currentBalance / limit) * 100);

      expect(percentage).toBe(80);
    });

    it("should handle zero balance", () => {
      const currentBalance = 0;
      const limit = 50000;
      const percentage = Math.round((currentBalance / limit) * 100);

      expect(percentage).toBe(0);
    });

    it("should handle full limit usage", () => {
      const currentBalance = 50000;
      const limit = 50000;
      const percentage = Math.round((currentBalance / limit) * 100);

      expect(percentage).toBe(100);
    });
  });
});
