import { CreditCardRepository } from "./credit-card.repository";
import {
  CreateCreditCardDto,
  UpdateCreditCardDto,
  CreditCardResponse,
} from "./credit-card.types";

export class CreditCardService {
  private creditCardRepository: CreditCardRepository;

  constructor() {
    this.creditCardRepository = new CreditCardRepository();
  }

  async createCreditCard(
    userId: string,
    data: CreateCreditCardDto,
  ): Promise<CreditCardResponse> {
    // Validar que el nombre no exista
    const nameExists = await this.creditCardRepository.checkNameExists(userId, data.name);
    if (nameExists) {
      throw new Error("Credit card name already exists");
    }

    // Validar límites
    if (data.limitGTQ < 0 || data.limitUSD < 0) {
      throw new Error("Credit limits must be positive numbers");
    }

    const creditCard = await this.creditCardRepository.create(userId, data);
    return this.mapToResponse(creditCard);
  }

  async getUserCreditCards(userId: string): Promise<CreditCardResponse[]> {
    const creditCards = await this.creditCardRepository.findByUserId(userId);
    return creditCards.map(this.mapToResponse);
  }

  async getCreditCardById(id: string, userId: string): Promise<CreditCardResponse> {
    const creditCard = await this.creditCardRepository.findById(id, userId);
    if (!creditCard) {
      throw new Error("Credit card not found");
    }
    return this.mapToResponse(creditCard);
  }

  async updateCreditCard(
    id: string,
    userId: string,
    data: UpdateCreditCardDto,
  ): Promise<CreditCardResponse> {
    // Verificar que la tarjeta existe
    const existingCreditCard = await this.creditCardRepository.findById(id, userId);
    if (!existingCreditCard) {
      throw new Error("Credit card not found");
    }

    // Si se está actualizando el nombre, verificar que no exista
    if (data.name && data.name !== existingCreditCard.name) {
      const nameExists = await this.creditCardRepository.checkNameExists(
        userId,
        data.name,
        id,
      );
      if (nameExists) {
        throw new Error("Credit card name already exists");
      }
    }

    // Validar límites si se están actualizando
    if (data.limitGTQ !== undefined && data.limitGTQ < 0) {
      throw new Error("GTQ limit must be a positive number");
    }
    if (data.limitUSD !== undefined && data.limitUSD < 0) {
      throw new Error("USD limit must be a positive number");
    }

    const updatedCreditCard = await this.creditCardRepository.update(id, userId, data);
    return this.mapToResponse(updatedCreditCard);
  }

  async deleteCreditCard(id: string, userId: string): Promise<void> {
    await this.creditCardRepository.delete(id, userId);
  }

  async getCreditCardTransactions(id: string, userId: string): Promise<any[]> {
    // Verificar que la tarjeta existe y pertenece al usuario
    const creditCard = await this.creditCardRepository.findById(id, userId);
    if (!creditCard) {
      throw new Error("Credit card not found");
    }

    return this.creditCardRepository.getExpensesByCard(id, userId);
  }

  async updateCreditCardBalance(
    id: string,
    userId: string,
    amountGTQ?: number,
    amountUSD?: number,
  ): Promise<CreditCardResponse> {
    // Verificar que la tarjeta existe
    const existingCreditCard = await this.creditCardRepository.findById(id, userId);
    if (!existingCreditCard) {
      throw new Error("Credit card not found");
    }

    const updateData: any = {};
    if (amountGTQ !== undefined) {
      if (amountGTQ < 0) {
        throw new Error("GTQ balance cannot be negative");
      }
      updateData.currentBalanceGTQ = amountGTQ;
    }
    if (amountUSD !== undefined) {
      if (amountUSD < 0) {
        throw new Error("USD balance cannot be negative");
      }
      updateData.currentBalanceUSD = amountUSD;
    }

    const updatedCreditCard = await this.creditCardRepository.updateBalance(
      id,
      userId,
      updateData,
    );
    return this.mapToResponse(updatedCreditCard);
  }

  async checkCreditLimitWarning(
    id: string,
    userId: string,
  ): Promise<{ needsWarning: boolean; currency?: "GTQ" | "USD"; percentage?: number }> {
    const creditCard = await this.creditCardRepository.findById(id, userId);
    if (!creditCard) {
      throw new Error("Credit card not found");
    }

    const gtqPercentage = (creditCard.currentBalanceGTQ / creditCard.limitGTQ) * 100;
    const usdPercentage = (creditCard.currentBalanceUSD / creditCard.limitUSD) * 100;

    if (gtqPercentage >= 80) {
      return { needsWarning: true, currency: "GTQ", percentage: gtqPercentage };
    }

    if (usdPercentage >= 80) {
      return { needsWarning: true, currency: "USD", percentage: usdPercentage };
    }

    return { needsWarning: false };
  }

  async getCardsNeedingWarnings(
    userId: string,
  ): Promise<
    Array<{ creditCard: CreditCardResponse; currency: "GTQ" | "USD"; percentage: number }>
  > {
    const creditCards = await this.creditCardRepository.findByUserId(userId);
    const warnings: Array<{
      creditCard: CreditCardResponse;
      currency: "GTQ" | "USD";
      percentage: number;
    }> = [];

    for (const card of creditCards) {
      if (!card.isActive) continue;

      const gtqPercentage = (card.currentBalanceGTQ / card.limitGTQ) * 100;
      const usdPercentage = (card.currentBalanceUSD / card.limitUSD) * 100;

      if (gtqPercentage >= 80) {
        warnings.push({
          creditCard: this.mapToResponse(card),
          currency: "GTQ",
          percentage: gtqPercentage,
        });
      }

      if (usdPercentage >= 80) {
        warnings.push({
          creditCard: this.mapToResponse(card),
          currency: "USD",
          percentage: usdPercentage,
        });
      }
    }

    return warnings;
  }

  async getCreditSummary(userId: string): Promise<{
    totalLimitGTQ: number;
    totalLimitUSD: number;
    totalUsedGTQ: number;
    totalUsedUSD: number;
    totalAvailableGTQ: number;
    totalAvailableUSD: number;
    activeCards: number;
  }> {
    const creditCards = await this.creditCardRepository.findByUserId(userId);
    const activeCards = creditCards.filter((card) => card.isActive);

    const summary = activeCards.reduce(
      (acc, card) => {
        acc.totalLimitGTQ += card.limitGTQ;
        acc.totalLimitUSD += card.limitUSD;
        acc.totalUsedGTQ += card.currentBalanceGTQ;
        acc.totalUsedUSD += card.currentBalanceUSD;
        return acc;
      },
      {
        totalLimitGTQ: 0,
        totalLimitUSD: 0,
        totalUsedGTQ: 0,
        totalUsedUSD: 0,
        totalAvailableGTQ: 0,
        totalAvailableUSD: 0,
        activeCards: activeCards.length,
      },
    );

    summary.totalAvailableGTQ = summary.totalLimitGTQ - summary.totalUsedGTQ;
    summary.totalAvailableUSD = summary.totalLimitUSD - summary.totalUsedUSD;

    return summary;
  }

  private mapToResponse(creditCard: any): CreditCardResponse {
    return {
      id: creditCard.id,
      name: creditCard.name,
      bank: creditCard.bank,
      limitGTQ: creditCard.limitGTQ,
      limitUSD: creditCard.limitUSD,
      currentBalanceGTQ: creditCard.currentBalanceGTQ,
      currentBalanceUSD: creditCard.currentBalanceUSD,
      availableBalanceGTQ: creditCard.limitGTQ - creditCard.currentBalanceGTQ,
      availableBalanceUSD: creditCard.limitUSD - creditCard.currentBalanceUSD,
      isActive: creditCard.isActive,
      createdAt: creditCard.createdAt,
      updatedAt: creditCard.updatedAt,
    };
  }
}
