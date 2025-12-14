import { DashboardRepository } from "./dashboard.repository";
import {
  DashboardSummaryResponse,
  MonthlyMetricsResponse,
  ChartDataResponse,
  ExpensesTrendResponse,
  PeriodFilters,
  DashboardFilters,
} from "./dashboard.types";

export class DashboardService {
  private dashboardRepository: DashboardRepository;

  constructor() {
    this.dashboardRepository = new DashboardRepository();
  }

  async getDashboardSummary(userId: string): Promise<DashboardSummaryResponse> {
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Get all dashboard data in parallel
    const [
      budgetSummary,
      creditCardsSummary,
      alertsSummary,
      recentExpensesSummary,
    ] = await Promise.all([
      this.dashboardRepository.getCurrentMonthBudgetSummary(userId, currentMonth, currentYear),
      this.dashboardRepository.getCreditCardsSummary(userId),
      this.dashboardRepository.getAlertsSummary(userId),
      this.dashboardRepository.getRecentExpensesSummary(userId),
    ]);

    return {
      currentMonth: {
        month: currentMonth,
        year: currentYear,
        totalIncome: budgetSummary?.totalIncome || 0,
        totalExpenses: budgetSummary?.totalExpenses || 0,
        availableBalance: budgetSummary?.availableBalance || 0,
        budgetExists: !!budgetSummary,
      },
      creditCards: creditCardsSummary,
      alerts: alertsSummary,
      recentExpenses: recentExpensesSummary,
    };
  }

  async getMonthlyMetrics(
    userId: string,
    month?: number,
    year?: number
  ): Promise<MonthlyMetricsResponse> {
    const now = new Date();
    const targetMonth = month || now.getMonth() + 1;
    const targetYear = year || now.getFullYear();

    // Validate month and year BEFORE making database calls
    if (month !== undefined && (month < 1 || month > 12)) {
      throw new Error("Month must be between 1 and 12");
    }

    if (year !== undefined && (year < 2000 || year > 2100)) {
      throw new Error("Year must be between 2000 and 2100");
    }

    return this.dashboardRepository.getMonthlyMetrics(userId, targetMonth, targetYear);
  }

  async getChartData(
    userId: string,
    chartType: 'expenses-by-category' | 'expenses-by-credit-card' | 'monthly-trends' | 'daily-expenses',
    filters?: DashboardFilters
  ): Promise<ChartDataResponse> {
    const now = new Date();
    const startDate = filters?.startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const endDate = filters?.endDate || new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    let data: any;

    switch (chartType) {
      case 'expenses-by-category':
        data = await this.getExpensesByCategoryChart(userId, { startDate, endDate });
        break;
      case 'expenses-by-credit-card':
        data = await this.getExpensesByCreditCardChart(userId, { startDate, endDate });
        break;
      case 'monthly-trends':
        data = await this.getMonthlyTrendsChart(userId, { startDate, endDate });
        break;
      case 'daily-expenses':
        data = await this.getDailyExpensesChart(userId, { startDate, endDate });
        break;
      default:
        throw new Error("Invalid chart type");
    }

    return {
      type: chartType,
      data,
      period: {
        startDate,
        endDate,
      },
    };
  }

  async getExpensesTrends(
    userId: string,
    filters: PeriodFilters
  ): Promise<ExpensesTrendResponse> {
    // Default to last 6 months if no filters provided
    if (!filters.startDate && !filters.endDate && !filters.month && !filters.year) {
      const now = new Date();
      filters.startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
      filters.endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    }

    return this.dashboardRepository.getExpensesTrends(userId, filters);
  }

  private async getExpensesByCategoryChart(userId: string, filters: PeriodFilters) {
    const month = filters.startDate ? filters.startDate.getMonth() + 1 : new Date().getMonth() + 1;
    const year = filters.startDate ? filters.startDate.getFullYear() : new Date().getFullYear();
    
    const monthlyMetrics = await this.dashboardRepository.getMonthlyMetrics(
      userId,
      month,
      year
    );

    return {
      categories: monthlyMetrics.expensesByCategory.map(category => ({
        name: category.categoryName,
        value: category.totalGTQ + category.totalUSD,
        percentage: category.percentage,
        color: category.categoryColor,
        icon: category.categoryIcon,
        totalGTQ: category.totalGTQ,
        totalUSD: category.totalUSD,
      })),
      total: monthlyMetrics.expenses,
    };
  }

  private async getExpensesByCreditCardChart(userId: string, filters: PeriodFilters) {
    const month = filters.startDate ? filters.startDate.getMonth() + 1 : new Date().getMonth() + 1;
    const year = filters.startDate ? filters.startDate.getFullYear() : new Date().getFullYear();
    
    const monthlyMetrics = await this.dashboardRepository.getMonthlyMetrics(
      userId,
      month,
      year
    );

    return {
      creditCards: monthlyMetrics.expensesByCreditCard.map(card => ({
        name: card.creditCardName,
        bank: card.creditCardBank,
        value: card.totalGTQ + card.totalUSD,
        percentage: card.percentage,
        totalGTQ: card.totalGTQ,
        totalUSD: card.totalUSD,
      })),
      total: monthlyMetrics.expenses,
    };
  }

  private async getMonthlyTrendsChart(userId: string, filters: PeriodFilters) {
    const trends = await this.dashboardRepository.getExpensesTrends(userId, filters);

    return {
      months: trends.months.map(month => ({
        label: `${month.year}-${month.month.toString().padStart(2, '0')}`,
        month: month.month,
        year: month.year,
        totalGTQ: month.totalGTQ,
        totalUSD: month.totalUSD,
        total: month.totalGTQ + month.totalUSD,
        expenseCount: month.expenseCount,
      })),
      categories: trends.categories.slice(0, 5).map(category => ({
        name: category.categoryName,
        color: category.categoryColor,
        data: category.monthlyData.map((data: any) => ({
          month: `${data.year}-${data.month.toString().padStart(2, '0')}`,
          value: data.totalGTQ + data.totalUSD,
          totalGTQ: data.totalGTQ,
          totalUSD: data.totalUSD,
        })),
      })),
    };
  }

  private async getDailyExpensesChart(userId: string, filters: PeriodFilters) {
    const month = filters.startDate ? filters.startDate.getMonth() + 1 : new Date().getMonth() + 1;
    const year = filters.startDate ? filters.startDate.getFullYear() : new Date().getFullYear();
    
    const monthlyMetrics = await this.dashboardRepository.getMonthlyMetrics(
      userId,
      month,
      year
    );

    return {
      dailyExpenses: monthlyMetrics.dailyExpenses.map(day => ({
        date: day.date,
        totalGTQ: day.totalGTQ,
        totalUSD: day.totalUSD,
        total: day.totalGTQ + day.totalUSD,
      })),
      averageDaily: monthlyMetrics.dailyExpenses.length > 0 
        ? monthlyMetrics.expenses / monthlyMetrics.dailyExpenses.length 
        : 0,
      totalExpenses: monthlyMetrics.expenses,
    };
  }
}