import { BudgetRepository } from "./budget.repository";
import { CreateBudgetDto, UpdateBudgetDto, BudgetResponse, BudgetPeriodResponse, BudgetSummaryResponse } from "./budget.types";

export class BudgetService {
  private budgetRepository: BudgetRepository;

  constructor() {
    this.budgetRepository = new BudgetRepository();
  }

  async createBudget(userId: string, data: CreateBudgetDto): Promise<BudgetResponse> {
    // Validar que el mes/año no exista ya
    const exists = await this.budgetRepository.checkMonthYearExists(userId, data.month, data.year);
    if (exists) {
      throw new Error('Budget for this month and year already exists');
    }

    // Validar frecuencia de pago
    if (!['BIWEEKLY', 'MONTHLY'].includes(data.paymentFrequency)) {
      throw new Error('Invalid payment frequency');
    }

    // Validar períodos según frecuencia
    this.validatePeriods(data.paymentFrequency, data.periods);

    const budget = await this.budgetRepository.create(userId, data);
    return this.mapToResponse(budget);
  }

  async getUserBudgets(userId: string): Promise<BudgetSummaryResponse[]> {
    const budgets = await this.budgetRepository.getUserBudgetSummaries(userId);
    return budgets.map(budget => ({
      id: budget.id,
      month: budget.month,
      year: budget.year,
      paymentFrequency: budget.paymentFrequency,
      totalIncome: budget.totalIncome,
      totalExpenses: budget.totalExpenses,
      availableBalance: budget.availableBalance,
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    }));
  }

  async getBudgetById(id: string, userId: string): Promise<BudgetResponse> {
    const budget = await this.budgetRepository.getBudgetWithExpenses(id, userId);
    if (!budget) {
      throw new Error('Budget not found');
    }
    return this.mapToResponseWithExpenses(budget);
  }

  async getBudgetByMonthYear(userId: string, month: number, year: number): Promise<BudgetResponse | null> {
    const budget = await this.budgetRepository.findByMonthYear(userId, month, year);
    if (!budget) {
      return null;
    }
    
    const budgetWithExpenses = await this.budgetRepository.getBudgetWithExpenses(budget.id, userId);
    return budgetWithExpenses ? this.mapToResponseWithExpenses(budgetWithExpenses) : null;
  }

  async updateBudget(id: string, userId: string, data: UpdateBudgetDto): Promise<BudgetResponse> {
    // Verificar que el presupuesto existe
    const existingBudget = await this.budgetRepository.findById(id, userId);
    if (!existingBudget) {
      throw new Error('Budget not found');
    }

    // Validar frecuencia de pago si se proporciona
    if (data.paymentFrequency && !['BIWEEKLY', 'MONTHLY'].includes(data.paymentFrequency)) {
      throw new Error('Invalid payment frequency');
    }

    // Validar períodos si se proporcionan
    if (data.periods) {
      const frequency = data.paymentFrequency || existingBudget.paymentFrequency;
      this.validatePeriods(frequency, data.periods);
    }

    const updatedBudget = await this.budgetRepository.update(id, userId, data);
    const budgetWithExpenses = await this.budgetRepository.getBudgetWithExpenses(id, userId);
    return budgetWithExpenses ? this.mapToResponseWithExpenses(budgetWithExpenses) : this.mapToResponse(updatedBudget);
  }

  async deleteBudget(id: string, userId: string): Promise<void> {
    await this.budgetRepository.delete(id, userId);
  }

  async copyFromPreviousMonth(userId: string, month: number, year: number): Promise<BudgetResponse | null> {
    // Calcular mes/año anterior
    let prevMonth = month - 1;
    let prevYear = year;
    
    if (prevMonth === 0) {
      prevMonth = 12;
      prevYear = year - 1;
    }

    // Buscar presupuesto del mes anterior
    const previousBudget = await this.budgetRepository.findByMonthYear(userId, prevMonth, prevYear);
    if (!previousBudget) {
      return null;
    }

    // Verificar que no exista presupuesto para el mes actual
    const exists = await this.budgetRepository.checkMonthYearExists(userId, month, year);
    if (exists) {
      throw new Error('Budget for this month and year already exists');
    }

    // Crear nuevo presupuesto basado en el anterior
    const newBudgetData: CreateBudgetDto = {
      month,
      year,
      paymentFrequency: previousBudget.paymentFrequency,
      periods: previousBudget.periods.map(period => ({
        periodNumber: period.periodNumber,
        income: period.income,
      })),
    };

    return this.createBudget(userId, newBudgetData);
  }

  private validatePeriods(frequency: string, periods: { periodNumber: number; income: number }[]): void {
    if (frequency === 'BIWEEKLY') {
      // Debe tener exactamente 2 períodos
      if (periods.length !== 2) {
        throw new Error('Biweekly budget must have exactly 2 periods');
      }
      
      // Verificar que los números de período sean 1 y 2
      const periodNumbers = periods.map(p => p.periodNumber).sort();
      if (periodNumbers[0] !== 1 || periodNumbers[1] !== 2) {
        throw new Error('Biweekly budget periods must be numbered 1 and 2');
      }
    } else if (frequency === 'MONTHLY') {
      // Debe tener exactamente 1 período
      if (periods.length !== 1) {
        throw new Error('Monthly budget must have exactly 1 period');
      }
      
      // Verificar que el número de período sea 1
      if (periods[0].periodNumber !== 1) {
        throw new Error('Monthly budget period must be numbered 1');
      }
    }

    // Validar que todos los ingresos sean positivos
    for (const period of periods) {
      if (period.income < 0) {
        throw new Error('Period income must be positive');
      }
    }
  }

  private mapToResponse(budget: any): BudgetResponse {
    return {
      id: budget.id,
      month: budget.month,
      year: budget.year,
      paymentFrequency: budget.paymentFrequency,
      totalIncome: budget.totalIncome,
      periods: budget.periods.map((period: any) => ({
        id: period.id,
        periodNumber: period.periodNumber,
        income: period.income,
        totalExpenses: 0, // Sin gastos en creación básica
        availableBalance: period.income,
        createdAt: period.createdAt,
        updatedAt: period.updatedAt,
      })),
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }

  private mapToResponseWithExpenses(budget: any): BudgetResponse {
    return {
      id: budget.id,
      month: budget.month,
      year: budget.year,
      paymentFrequency: budget.paymentFrequency,
      totalIncome: budget.totalIncome,
      periods: budget.periods.map((period: any) => {
        const totalExpenses = period.expenses.reduce((sum: number, expense: any) => sum + expense.amount, 0);
        return {
          id: period.id,
          periodNumber: period.periodNumber,
          income: period.income,
          totalExpenses,
          availableBalance: period.income - totalExpenses,
          createdAt: period.createdAt,
          updatedAt: period.updatedAt,
        };
      }),
      createdAt: budget.createdAt,
      updatedAt: budget.updatedAt,
    };
  }
}