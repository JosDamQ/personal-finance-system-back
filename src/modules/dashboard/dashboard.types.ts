export interface DashboardSummaryResponse {
  currentMonth: {
    month: number;
    year: number;
    totalIncome: number;
    totalExpenses: number;
    availableBalance: number;
    budgetExists: boolean;
  };
  creditCards: {
    totalLimitGTQ: number;
    totalLimitUSD: number;
    totalUsedGTQ: number;
    totalUsedUSD: number;
    availableCreditGTQ: number;
    availableCreditUSD: number;
    cardsCount: number;
    cardsNearLimit: number; // Cards at 80%+ usage
  };
  alerts: {
    unreadCount: number;
    criticalCount: number; // Credit limit warnings and budget exceeded
  };
  recentExpenses: {
    totalLast7Days: number;
    totalLast30Days: number;
    averageDaily: number;
  };
}

export interface MonthlyMetricsResponse {
  month: number;
  year: number;
  income: number;
  expenses: number;
  balance: number;
  expensesByCategory: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    categoryIcon: string;
    totalGTQ: number;
    totalUSD: number;
    percentage: number;
  }>;
  expensesByCreditCard: Array<{
    creditCardId: string;
    creditCardName: string;
    creditCardBank: string;
    totalGTQ: number;
    totalUSD: number;
    percentage: number;
  }>;
  dailyExpenses: Array<{
    date: string;
    totalGTQ: number;
    totalUSD: number;
  }>;
}

export interface ChartDataResponse {
  type: 'expenses-by-category' | 'expenses-by-credit-card' | 'monthly-trends' | 'daily-expenses';
  data: any;
  period: {
    startDate: Date;
    endDate: Date;
  };
}

export interface ExpensesTrendResponse {
  months: Array<{
    month: number;
    year: number;
    totalGTQ: number;
    totalUSD: number;
    expenseCount: number;
  }>;
  categories: Array<{
    categoryId: string;
    categoryName: string;
    categoryColor: string;
    monthlyData: Array<{
      month: number;
      year: number;
      totalGTQ: number;
      totalUSD: number;
    }>;
  }>;
}

export interface PeriodFilters {
  startDate?: Date;
  endDate?: Date;
  month?: number;
  year?: number;
}

export interface DashboardFilters extends PeriodFilters {
  currency?: 'GTQ' | 'USD' | 'ALL';
}