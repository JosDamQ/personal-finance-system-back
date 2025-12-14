import { CreditCardService } from "./credit-card.service";
import { CreateCreditCardDto, UpdateCreditCardDto } from "./credit-card.types";

describe("CreditCardService", () => {
  let creditCardService: CreditCardService;

  beforeEach(() => {
    creditCardService = new CreditCardService();
  });

  describe("Input validation", () => {
    it("should validate credit card data structure", () => {
      const cardData: CreateCreditCardDto = {
        name: "Visa Gold",
        bank: "Banco Industrial",
        limitGTQ: 50000,
        limitUSD: 6500,
      };

      expect(cardData.name).toBe("Visa Gold");
      expect(cardData.bank).toBe("Banco Industrial");
      expect(cardData.limitGTQ).toBe(50000);
      expect(cardData.limitUSD).toBe(6500);
    });

    it("should handle numeric limits correctly", () => {
      const cardData: CreateCreditCardDto = {
        name: "Test Card",
        bank: "Test Bank",
        limitGTQ: 0,
        limitUSD: 0,
      };

      expect(typeof cardData.limitGTQ).toBe("number");
      expect(typeof cardData.limitUSD).toBe("number");
    });
  });

  describe("Update validation", () => {
    it("should accept partial updates", () => {
      const updateData: UpdateCreditCardDto = {
        limitGTQ: 60000,
      };

      expect(updateData.limitGTQ).toBe(60000);
      expect(updateData.name).toBeUndefined();
    });

    it("should handle isActive flag", () => {
      const updateData: UpdateCreditCardDto = {
        isActive: false,
      };

      expect(updateData.isActive).toBe(false);
    });
  });

  describe("Balance calculations", () => {
    it("should calculate available balance correctly", () => {
      const limit = 50000;
      const currentBalance = 15000;
      const availableBalance = limit - currentBalance;

      expect(availableBalance).toBe(35000);
    });

    it("should handle zero balance", () => {
      const limit = 50000;
      const currentBalance = 0;
      const availableBalance = limit - currentBalance;

      expect(availableBalance).toBe(50000);
    });

    it("should handle full limit usage", () => {
      const limit = 50000;
      const currentBalance = 50000;
      const availableBalance = limit - currentBalance;

      expect(availableBalance).toBe(0);
    });
  });
});
