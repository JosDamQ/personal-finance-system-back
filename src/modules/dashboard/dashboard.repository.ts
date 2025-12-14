import { PrismaClient } from "@prisma/client";
import { PeriodFilters } from "./dashboard.types";

const prisma = new PrismaClient();

export class DashboardRepository {
  // Get current month budget summary
  async getCurrentMonthBudgetSummary(userId: string, month: number, year: number) {
    const budget = await prisma.budget.findFirst({
      where: {
        userId,
        month,
        year,
      },
      include: {
        periods: {
          include: {
            expenses: true,
          },
        },
      },
    });

    if (!budget) {
      return null;
    }

    const totalExpenses = budget.periods.reduce((sum, period) => {
      return sum + period.expenses.reduce((expSum, expense) => expSum + expense.amount, 0);
    }, 0);

    return {
      id: budget.id,
      month: budget.month,
      year: budget.year,
      totalIncome: budget.totalIncome,
      totalExpenses,
      availableBalance: budget.totalIncome - totalExpenses,
    };
  }

  // Get credit cards summary
  async getCreditCardsSummary(userId: string) {
    const creditCards = await prisma.creditCard.findMany({
      where: {
        userId,
        isActive: true,
      },
    });

    const summary = creditCards.reduce(
      (acc, card) => {
        acc.totalLimitGTQ += card.limitGTQ;
        acc.totalLimitUSD += card.limitUSD;
        acc.totalUsedGTQ += card.currentBalanceGTQ;
        acc.totalUsedUSD += card.currentBalanceUSD;

        // Check if card is near limit (80%+)
        const gtqUsagePercent = card.limitGTQ > 0 ? (card.currentBalanceGTQ / card.limitGTQ) * 100 : 0;
        const usdUsagePercent = card.limitUSD > 0 ? (card.currentBalanceUSD / card.limitUSD) * 100 : 0;
        
        if (gtqUsagePercent >= 80 || usdUsagePercent >= 80) {
          acc.cardsNearLimit++;
        }

        return acc;
      },
      {
        totalLimitGTQ: 0,
        totalLimitUSD: 0,
        totalUsedGTQ: 0,
        totalUsedUSD: 0,
        cardsNearLimit: 0,
      }
    );

    return {
      ...summary,
      availableCreditGTQ: summary.totalLimitGTQ - summary.totalUsedGTQ,
      availableCreditUSD: summary.totalLimitUSD - summary.totalUsedUSD,
      cardsCount: creditCards.length,
    };
  }

  // Get alerts summary
  async getAlertsSummary(userId: string) {
    const alerts = await prisma.alert.findMany({
      where: {
        userId,
      },
    });

    const unreadCount = alerts.filter(alert => !alert.isRead).length;
    const criticalCount = alerts.filter(alert => 
      !alert.isRead && 
      (alert.type === 'CREDIT_LIMIT_WARNING' || alert.type === 'BUDGET_EXCEEDED')
    ).length;

    return {
      unreadCount,
      criticalCount,
    };
  }

  // Get recent expenses summary
  async getRecentExpensesSummary(userId: string) {
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [last7DaysExpenses, last30DaysExpenses] = await Promise.all([
      prisma.expense.findMany({
        where: {
          userId,
          date: {
            gte: last7Days,
          },
        },
      }),
      prisma.expense.findMany({
        where: {
          userId,
          date: {
            gte: last30Days,
          },
        },
      }),
    ]);

    const totalLast7Days = last7DaysExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalLast30Days = last30DaysExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const averageDaily = totalLast30Days / 30;

    return {
      totalLast7Days,
      totalLast30Days,
      averageDaily,
    };
  }

  // Get monthly metrics
  async getMonthlyMetrics(userId: string, month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get budget for the month
    const budget = await this.getCurrentMonthBudgetSummary(userId, month, year);

    // Get expenses for the month
    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
        creditCard: {
          select: {
            id: true,
            name: true,
            bank: true,
          },
        },
      },
    });

    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

    // Group by category
    const categoryMap = new Map();
    expenses.forEach((expense) => {
      const key = expense.categoryId;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: expense.categoryId,
          categoryName: expense.category.name,
          categoryColor: expense.category.color,
          categoryIcon: expense.category.icon,
          totalGTQ: 0,
          totalUSD: 0,
        });
      }
      const category = categoryMap.get(key);
      if (expense.currency === "GTQ") {
        category.totalGTQ += expense.amount;
      } else {
        category.totalUSD += expense.amount;
      }
    });

    // Group by credit card
    const creditCardMap = new Map();
    expenses.forEach((expense) => {
      if (expense.creditCardId && expense.creditCard) {
        const key = expense.creditCardId;
        if (!creditCardMap.has(key)) {
          creditCardMap.set(key, {
            creditCardId: expense.creditCardId,
            creditCardName: expense.creditCard.name,
            creditCardBank: expense.creditCard.bank,
            totalGTQ: 0,
            totalUSD: 0,
          });
        }
        const creditCard = creditCardMap.get(key);
        if (expense.currency === "GTQ") {
          creditCard.totalGTQ += expense.amount;
        } else {
          creditCard.totalUSD += expense.amount;
        }
      }
    });

    // Group by day
    const dailyMap = new Map();
    expenses.forEach((expense) => {
      const dateKey = expense.date.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          totalGTQ: 0,
          totalUSD: 0,
        });
      }
      const daily = dailyMap.get(dateKey);
      if (expense.currency === "GTQ") {
        daily.totalGTQ += expense.amount;
      } else {
        daily.totalUSD += expense.amount;
      }
    });

    // Calculate percentages
    const expensesByCategory = Array.from(categoryMap.values()).map(category => ({
      ...category,
      percentage: totalExpenses > 0 ? ((category.totalGTQ + category.totalUSD) / totalExpenses) * 100 : 0,
    }));

    const expensesByCreditCard = Array.from(creditCardMap.values()).map(creditCard => ({
      ...creditCard,
      percentage: totalExpenses > 0 ? ((creditCard.totalGTQ + creditCard.totalUSD) / totalExpenses) * 100 : 0,
    }));

    const dailyExpenses = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    return {
      month,
      year,
      income: budget?.totalIncome || 0,
      expenses: totalExpenses,
      balance: (budget?.totalIncome || 0) - totalExpenses,
      expensesByCategory,
      expensesByCreditCard,
      dailyExpenses,
    };
  }

  // Get expenses trends over multiple months
  async getExpensesTrends(userId: string, filters: PeriodFilters): Promise<{
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
  }> {
    const { startDate, endDate } = this.getDateRange(filters);

    const expenses = await prisma.expense.findMany({
      where: {
        userId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Group by month
    const monthlyMap = new Map<string, {
      month: number;
      year: number;
      totalGTQ: number;
      totalUSD: number;
      expenseCount: number;
    }>();
    const categoryMonthlyMap = new Map<string, {
      categoryId: string;
      categoryName: string;
      categoryColor: string;
      monthlyData: Map<string, {
        month: number;
        year: number;
        totalGTQ: number;
        totalUSD: number;
      }>;
    }>();

    expenses.forEach((expense) => {
      const monthKey = `${expense.date.getFullYear()}-${expense.date.getMonth() + 1}`;
      const month = expense.date.getMonth() + 1;
      const year = expense.date.getFullYear();

      // Monthly totals
      if (!monthlyMap.has(monthKey)) {
        monthlyMap.set(monthKey, {
          month,
          year,
          totalGTQ: 0,
          totalUSD: 0,
          expenseCount: 0,
        });
      }
      const monthlyData = monthlyMap.get(monthKey);
      if (monthlyData) {
        if (expense.currency === "GTQ") {
          monthlyData.totalGTQ += expense.amount;
        } else {
          monthlyData.totalUSD += expense.amount;
        }
        monthlyData.expenseCount++;
      }

      // Category monthly data
      const categoryKey = expense.categoryId;
      if (!categoryMonthlyMap.has(categoryKey)) {
        categoryMonthlyMap.set(categoryKey, {
          categoryId: expense.categoryId,
          categoryName: expense.category.name,
          categoryColor: expense.category.color,
          monthlyData: new Map(),
        });
      }
      const categoryData = categoryMonthlyMap.get(categoryKey);
      if (categoryData) {
        if (!categoryData.monthlyData.has(monthKey)) {
          categoryData.monthlyData.set(monthKey, {
            month,
            year,
            totalGTQ: 0,
            totalUSD: 0,
          });
        }
        const categoryMonthlyData = categoryData.monthlyData.get(monthKey);
        if (categoryMonthlyData) {
          if (expense.currency === "GTQ") {
            categoryMonthlyData.totalGTQ += expense.amount;
          } else {
            categoryMonthlyData.totalUSD += expense.amount;
          }
        }
      }
    });

    const months = Array.from(monthlyMap.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });

    const categories = Array.from(categoryMonthlyMap.values()).map(category => ({
      categoryId: category.categoryId,
      categoryName: category.categoryName,
      categoryColor: category.categoryColor,
      monthlyData: Array.from(category.monthlyData.values()).sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      }),
    }));

    return {
      months,
      categories,
    };
  }

  private getDateRange(filters: PeriodFilters): { startDate: Date; endDate: Date } {
    if (filters.startDate && filters.endDate) {
      return {
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
    }

    if (filters.month && filters.year) {
      return {
        startDate: new Date(filters.year, filters.month - 1, 1),
        endDate: new Date(filters.year, filters.month, 0, 23, 59, 59),
      };
    }

    // Default to current month
    const now = new Date();
    return {
      startDate: new Date(now.getFullYear(), now.getMonth(), 1),
      endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
    };
  }
}