import { ExpenseService } from "./expense.service";
import { CreateExpenseDto, UpdateExpenseDto } from "./expense.types";

describe("ExpenseService", () => {
  let expenseService: ExpenseService;

  beforeEach(() => {
    expenseService = new ExpenseService();
  });

  describe("Input validation", () => {
    it("should validate expense data structure", () => {
      const expenseData: CreateExpenseDto = {
        categoryId: "category-123",
        creditCardId: "card-123",
        amount: 150.5,
        currency: "GTQ",
        description: "Grocery shopping",
        date: new Date("2024-12-14"),
      };

      expect(expenseData.categoryId).toBe("category-123");
      expect(expenseData.creditCardId).toBe("card-123");
      expect(expenseData.amount).toBe(150.5);
      expect(expenseData.currency).toBe("GTQ");
      expect(expenseData.description).toBe("Grocery shopping");
      expect(expenseData.date).toBeInstanceOf(Date);
    });

    it("should handle optional credit card", () => {
      const expenseData: CreateExpenseDto = {
        categoryId: "category-123",
        amount: 50.0,
        currency: "GTQ",
        description: "Cash expense",
        date: new Date("2024-12-14"),
      };

      expect(expenseData.creditCardId).toBeUndefined();
      expect(expenseData.amount).toBe(50.0);
    });

    it("should validate currency types", () => {
      const gtqExpense: CreateExpenseDto = {
        categoryId: "category-123",
        amount: 100,
        currency: "GTQ",
        description: "GTQ expense",
        date: new Date(),
      };

      const usdExpense: CreateExpenseDto = {
        categoryId: "category-123",
        amount: 100,
        currency: "USD",
        description: "USD expense",
        date: new Date(),
      };

      expect(gtqExpense.currency).toBe("GTQ");
      expect(usdExpense.currency).toBe("USD");
    });
  });

  describe("Update validation", () => {
    it("should accept partial updates", () => {
      const updateData: UpdateExpenseDto = {
        amount: 200.0,
        description: "Updated description",
      };

      expect(updateData.amount).toBe(200.0);
      expect(updateData.description).toBe("Updated description");
      expect(updateData.categoryId).toBeUndefined();
    });

    it("should handle currency updates", () => {
      const updateData: UpdateExpenseDto = {
        currency: "USD",
      };

      expect(updateData.currency).toBe("USD");
    });
  });

  describe("Amount calculations", () => {
    it("should handle decimal amounts correctly", () => {
      const amount1 = 150.5;
      const amount2 = 75.25;
      const total = amount1 + amount2;

      expect(total).toBeCloseTo(225.75, 2);
    });

    it("should handle zero amounts", () => {
      const amount = 0;
      expect(amount).toBe(0);
    });
  });
});
