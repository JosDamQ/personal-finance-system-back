import { ExpenseRepository } from "./expense.repository";
import {
  CreateExpenseDto,
  UpdateExpenseDto,
  ExpenseResponse,
  ExpenseFilters,
  ExpenseSummary,
} from "./expense.types";

export class ExpenseService {
  private expenseRepository: ExpenseRepository;

  constructor() {
    this.expenseRepository = new ExpenseRepository();
  }

  async createExpense(userId: string, data: CreateExpenseDto): Promise<ExpenseResponse> {
    // Validaciones de negocio
    await this.validateExpenseData(userId, data);

    const expense = await this.expenseRepository.create(userId, data);

    // Actualizar saldo de tarjeta de crédito si aplica
    if (data.creditCardId) {
      await this.updateCreditCardBalance(
        data.creditCardId,
        userId,
        data.amount,
        data.currency,
      );

      // Verificar alertas de límite de crédito después de actualizar el saldo
      await this.checkCreditLimitAlerts(userId, data.creditCardId);
    }

    // Verificar alertas de presupuesto excedido si aplica
    if (data.budgetPeriodId) {
      await this.checkBudgetExceededAlerts(userId, data.budgetPeriodId);
    }

    // Obtener el gasto completo con relaciones
    const fullExpense = await this.expenseRepository.findById(expense.id, userId);
    if (!fullExpense) {
      throw new Error("Failed to retrieve created expense");
    }

    return this.mapToResponse(fullExpense);
  }

  async getUserExpenses(
    userId: string,
    filters?: ExpenseFilters,
  ): Promise<ExpenseResponse[]> {
    const expenses = await this.expenseRepository.findByUserId(userId, filters);
    return expenses.map(this.mapToResponse);
  }

  async getExpensesWithFilters(
    userId: string,
    filters: {
      startDate?: Date;
      endDate?: Date;
      categoryId?: string;
      creditCardId?: string;
    },
  ): Promise<ExpenseResponse[]> {
    const expenseFilters: ExpenseFilters = {
      startDate: filters.startDate,
      endDate: filters.endDate,
      categoryId: filters.categoryId,
      creditCardId: filters.creditCardId,
    };
    
    const expenses = await this.expenseRepository.findByUserId(userId, expenseFilters);
    return expenses.map(this.mapToResponse);
  }

  async getExpenseById(id: string, userId: string): Promise<ExpenseResponse> {
    const expense = await this.expenseRepository.findById(id, userId);
    if (!expense) {
      throw new Error("Expense not found");
    }
    return this.mapToResponse(expense);
  }

  async updateExpense(
    id: string,
    userId: string,
    data: UpdateExpenseDto,
  ): Promise<ExpenseResponse> {
    // Verificar que el gasto existe
    const existingExpense = await this.expenseRepository.findById(id, userId);
    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    // Validar nuevos datos si se proporcionan
    if (data.categoryId) {
      const categoryExists = await this.expenseRepository.validateCategoryExists(
        data.categoryId,
        userId,
      );
      if (!categoryExists) {
        throw new Error("Category not found");
      }
    }

    if (data.creditCardId) {
      const creditCardExists = await this.expenseRepository.validateCreditCardExists(
        data.creditCardId,
        userId,
      );
      if (!creditCardExists) {
        throw new Error("Credit card not found");
      }
    }

    if (data.budgetPeriodId) {
      const budgetPeriodExists = await this.expenseRepository.validateBudgetPeriodExists(
        data.budgetPeriodId,
        userId,
      );
      if (!budgetPeriodExists) {
        throw new Error("Budget period not found");
      }
    }

    // Validar montos y moneda
    if (data.amount !== undefined) {
      if (data.amount <= 0) {
        throw new Error("Amount must be greater than 0");
      }
    }

    if (data.currency && !["GTQ", "USD"].includes(data.currency)) {
      throw new Error("Currency must be GTQ or USD");
    }

    // Manejar cambios en tarjeta de crédito
    const oldCreditCardId = existingExpense.creditCardId;
    const newCreditCardId =
      data.creditCardId !== undefined ? data.creditCardId : oldCreditCardId;
    const oldAmount = existingExpense.amount;
    const oldCurrency = existingExpense.currency;
    const newAmount = data.amount !== undefined ? data.amount : oldAmount;
    const newCurrency = data.currency !== undefined ? data.currency : oldCurrency;

    // Actualizar el gasto
    const updatedExpense = await this.expenseRepository.update(id, userId, data);

    // Actualizar saldos de tarjetas de crédito si es necesario
    if (oldCreditCardId !== newCreditCardId) {
      // Revertir el gasto de la tarjeta anterior
      if (oldCreditCardId) {
        await this.updateCreditCardBalance(
          oldCreditCardId,
          userId,
          -oldAmount,
          oldCurrency,
        );
      }
      // Aplicar el gasto a la nueva tarjeta
      if (newCreditCardId) {
        await this.updateCreditCardBalance(
          newCreditCardId,
          userId,
          newAmount,
          newCurrency,
        );
      }
    } else if (
      oldCreditCardId &&
      (oldAmount !== newAmount || oldCurrency !== newCurrency)
    ) {
      // Misma tarjeta pero cambió el monto o moneda
      await this.updateCreditCardBalance(
        oldCreditCardId,
        userId,
        -oldAmount,
        oldCurrency,
      );
      await this.updateCreditCardBalance(oldCreditCardId, userId, newAmount, newCurrency);
    }

    // Obtener el gasto actualizado con relaciones
    const fullExpense = await this.expenseRepository.findById(updatedExpense.id, userId);
    if (!fullExpense) {
      throw new Error("Failed to retrieve updated expense");
    }

    return this.mapToResponse(fullExpense);
  }

  async deleteExpense(id: string, userId: string): Promise<void> {
    // Verificar que el gasto existe
    const existingExpense = await this.expenseRepository.findById(id, userId);
    if (!existingExpense) {
      throw new Error("Expense not found");
    }

    // Revertir el saldo de la tarjeta de crédito si aplica
    if (existingExpense.creditCardId) {
      await this.updateCreditCardBalance(
        existingExpense.creditCardId,
        userId,
        -existingExpense.amount,
        existingExpense.currency,
      );
    }

    await this.expenseRepository.delete(id, userId);
  }

  async getExpensesByCreditCard(
    creditCardId: string,
    userId: string,
  ): Promise<ExpenseResponse[]> {
    // Verificar que la tarjeta existe y pertenece al usuario
    const creditCardExists = await this.expenseRepository.validateCreditCardExists(
      creditCardId,
      userId,
    );
    if (!creditCardExists) {
      throw new Error("Credit card not found");
    }

    const expenses = await this.expenseRepository.findByCreditCard(creditCardId, userId);
    return expenses.map(this.mapToResponse);
  }

  async getExpensesByCategory(
    categoryId: string,
    userId: string,
  ): Promise<ExpenseResponse[]> {
    // Verificar que la categoría existe y pertenece al usuario
    const categoryExists = await this.expenseRepository.validateCategoryExists(
      categoryId,
      userId,
    );
    if (!categoryExists) {
      throw new Error("Category not found");
    }

    const expenses = await this.expenseRepository.findByCategory(categoryId, userId);
    return expenses.map(this.mapToResponse);
  }

  async getExpensesByBudgetPeriod(
    budgetPeriodId: string,
    userId: string,
  ): Promise<ExpenseResponse[]> {
    // Verificar que el período de presupuesto existe y pertenece al usuario
    const budgetPeriodExists = await this.expenseRepository.validateBudgetPeriodExists(
      budgetPeriodId,
      userId,
    );
    if (!budgetPeriodExists) {
      throw new Error("Budget period not found");
    }

    const expenses = await this.expenseRepository.findByBudgetPeriod(
      budgetPeriodId,
      userId,
    );
    return expenses.map(this.mapToResponse);
  }

  async getExpensesSummary(
    userId: string,
    filters?: ExpenseFilters,
  ): Promise<ExpenseSummary> {
    const summary = await this.expenseRepository.getSummaryByFilters(userId, filters);

    return {
      totalGTQ: summary.totalGTQ,
      totalUSD: summary.totalUSD,
      count: summary.count,
      byCategory: summary.byCategory.map((cat) => ({
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        totalGTQ: cat.totalGTQ,
        totalUSD: cat.totalUSD,
        count: cat.count,
      })),
      byCreditCard: summary.byCreditCard.map((card) => ({
        creditCardId: card.creditCardId,
        creditCardName: card.creditCardName,
        totalGTQ: card.totalGTQ,
        totalUSD: card.totalUSD,
        count: card.count,
      })),
    };
  }

  private async validateExpenseData(
    userId: string,
    data: CreateExpenseDto,
  ): Promise<void> {
    // Validar categoría
    const categoryExists = await this.expenseRepository.validateCategoryExists(
      data.categoryId,
      userId,
    );
    if (!categoryExists) {
      throw new Error("Category not found");
    }

    // Validar tarjeta de crédito si se proporciona
    if (data.creditCardId) {
      const creditCardExists = await this.expenseRepository.validateCreditCardExists(
        data.creditCardId,
        userId,
      );
      if (!creditCardExists) {
        throw new Error("Credit card not found");
      }
    }

    // Validar período de presupuesto si se proporciona
    if (data.budgetPeriodId) {
      const budgetPeriodExists = await this.expenseRepository.validateBudgetPeriodExists(
        data.budgetPeriodId,
        userId,
      );
      if (!budgetPeriodExists) {
        throw new Error("Budget period not found");
      }
    }

    // Validar monto
    if (data.amount <= 0) {
      throw new Error("Amount must be greater than 0");
    }

    // Validar moneda
    if (!["GTQ", "USD"].includes(data.currency)) {
      throw new Error("Currency must be GTQ or USD");
    }

    // Validar descripción
    if (!data.description || data.description.trim().length === 0) {
      throw new Error("Description is required");
    }

    // Validar fecha
    if (!data.date || isNaN(data.date.getTime())) {
      throw new Error("Valid date is required");
    }
  }

  private async updateCreditCardBalance(
    creditCardId: string,
    userId: string,
    amount: number,
    currency: string,
  ): Promise<void> {
    // Importar dinámicamente para evitar dependencias circulares
    const { CreditCardService } = await import("../credit-cards/credit-card.service");
    const creditCardService = new CreditCardService();

    try {
      const creditCard = await creditCardService.getCreditCardById(creditCardId, userId);

      if (currency === "GTQ") {
        const newBalance = creditCard.currentBalanceGTQ + amount;
        await creditCardService.updateCreditCardBalance(
          creditCardId,
          userId,
          newBalance,
          undefined,
        );
      } else if (currency === "USD") {
        const newBalance = creditCard.currentBalanceUSD + amount;
        await creditCardService.updateCreditCardBalance(
          creditCardId,
          userId,
          undefined,
          newBalance,
        );
      }
    } catch (error) {
      console.error("Error updating credit card balance:", error);
      // No lanzar error para no bloquear la operación principal
    }
  }

  private async checkCreditLimitAlerts(
    userId: string,
    creditCardId: string,
  ): Promise<void> {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { AlertService } = await import("../alerts/alert.service");
      const alertService = new AlertService();

      // Ejecutar verificación de límites de crédito para esta tarjeta específica
      await alertService.checkAndCreateCreditLimitWarnings(userId);
    } catch (error) {
      console.error("Error checking credit limit alerts:", error);
      // No lanzar error para no bloquear la operación principal
    }
  }

  private async checkBudgetExceededAlerts(
    userId: string,
    budgetPeriodId: string,
  ): Promise<void> {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { AlertService } = await import("../alerts/alert.service");
      const alertService = new AlertService();

      // Verificar si el presupuesto ha sido excedido
      await alertService.checkAndCreateBudgetExceededAlert(userId, budgetPeriodId);
    } catch (error) {
      console.error("Error checking budget exceeded alerts:", error);
      // No lanzar error para no bloquear la operación principal
    }
  }

  private mapToResponse(expense: any): ExpenseResponse {
    return {
      id: expense.id,
      categoryId: expense.categoryId,
      creditCardId: expense.creditCardId,
      budgetPeriodId: expense.budgetPeriodId,
      amount: expense.amount,
      currency: expense.currency,
      description: expense.description,
      date: expense.date,
      createdAt: expense.createdAt,
      updatedAt: expense.updatedAt,
      category: expense.category
        ? {
            id: expense.category.id,
            name: expense.category.name,
            color: expense.category.color,
            icon: expense.category.icon,
          }
        : undefined,
      creditCard: expense.creditCard
        ? {
            id: expense.creditCard.id,
            name: expense.creditCard.name,
            bank: expense.creditCard.bank,
          }
        : undefined,
      budgetPeriod: expense.budgetPeriod
        ? {
            id: expense.budgetPeriod.id,
            periodNumber: expense.budgetPeriod.periodNumber,
          }
        : undefined,
    };
  }
}
