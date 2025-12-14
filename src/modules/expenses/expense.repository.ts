import { PrismaClient, Expense, Currency } from "@prisma/client";
import { CreateExpenseDto, UpdateExpenseDto, ExpenseFilters } from "./expense.types";

const prisma = new PrismaClient();

export class ExpenseRepository {
  async create(userId: string, data: CreateExpenseDto): Promise<Expense> {
    return prisma.expense.create({
      data: {
        userId,
        categoryId: data.categoryId,
        creditCardId: data.creditCardId,
        budgetPeriodId: data.budgetPeriodId,
        amount: data.amount,
        currency: data.currency as Currency,
        description: data.description,
        date: data.date,
      },
    });
  }

  async findByUserId(userId: string, filters?: ExpenseFilters): Promise<Expense[]> {
    const where: any = { userId };

    if (filters) {
      if (filters.startDate && filters.endDate) {
        where.date = {
          gte: filters.startDate,
          lte: filters.endDate,
        };
      } else if (filters.startDate) {
        where.date = { gte: filters.startDate };
      } else if (filters.endDate) {
        where.date = { lte: filters.endDate };
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.creditCardId) {
        where.creditCardId = filters.creditCardId;
      }

      if (filters.budgetPeriodId) {
        where.budgetPeriodId = filters.budgetPeriodId;
      }

      if (filters.currency) {
        where.currency = filters.currency;
      }

      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        where.amount = {};
        if (filters.minAmount !== undefined) {
          where.amount.gte = filters.minAmount;
        }
        if (filters.maxAmount !== undefined) {
          where.amount.lte = filters.maxAmount;
        }
      }
    }

    return prisma.expense.findMany({
      where,
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
        budgetPeriod: {
          select: {
            id: true,
            periodNumber: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findById(id: string, userId: string): Promise<Expense | null> {
    return prisma.expense.findFirst({
      where: { id, userId },
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
        budgetPeriod: {
          select: {
            id: true,
            periodNumber: true,
          },
        },
      },
    });
  }

  async update(id: string, userId: string, data: UpdateExpenseDto): Promise<Expense> {
    return prisma.expense.update({
      where: { id },
      data: {
        ...data,
        currency: data.currency as Currency | undefined,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    // Verificar que el gasto existe y pertenece al usuario
    const expense = await this.findById(id, userId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    await prisma.expense.delete({
      where: { id },
    });
  }

  async findByCreditCard(creditCardId: string, userId: string): Promise<Expense[]> {
    return prisma.expense.findMany({
      where: { creditCardId, userId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            icon: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findByCategory(categoryId: string, userId: string): Promise<Expense[]> {
    return prisma.expense.findMany({
      where: { categoryId, userId },
      include: {
        creditCard: {
          select: {
            id: true,
            name: true,
            bank: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findByBudgetPeriod(budgetPeriodId: string, userId: string): Promise<Expense[]> {
    return prisma.expense.findMany({
      where: { budgetPeriodId, userId },
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
      orderBy: { date: 'desc' },
    });
  }

  async getSummaryByFilters(userId: string, filters?: ExpenseFilters): Promise<{
    totalGTQ: number;
    totalUSD: number;
    count: number;
    byCategory: Array<{
      categoryId: string;
      categoryName: string;
      categoryColor: string;
      categoryIcon: string;
      totalGTQ: number;
      totalUSD: number;
      count: number;
    }>;
    byCreditCard: Array<{
      creditCardId: string;
      creditCardName: string;
      creditCardBank: string;
      totalGTQ: number;
      totalUSD: number;
      count: number;
    }>;
  }> {
    const where: any = { userId };

    if (filters) {
      if (filters.startDate && filters.endDate) {
        where.date = {
          gte: filters.startDate,
          lte: filters.endDate,
        };
      } else if (filters.startDate) {
        where.date = { gte: filters.startDate };
      } else if (filters.endDate) {
        where.date = { lte: filters.endDate };
      }

      if (filters.categoryId) {
        where.categoryId = filters.categoryId;
      }

      if (filters.creditCardId) {
        where.creditCardId = filters.creditCardId;
      }

      if (filters.budgetPeriodId) {
        where.budgetPeriodId = filters.budgetPeriodId;
      }

      if (filters.currency) {
        where.currency = filters.currency;
      }

      if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
        where.amount = {};
        if (filters.minAmount !== undefined) {
          where.amount.gte = filters.minAmount;
        }
        if (filters.maxAmount !== undefined) {
          where.amount.lte = filters.maxAmount;
        }
      }
    }

    // Get all expenses with the filters
    const expenses = await prisma.expense.findMany({
      where,
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

    // Calculate totals
    const totalGTQ = expenses
      .filter(e => e.currency === 'GTQ')
      .reduce((sum, e) => sum + e.amount, 0);
    
    const totalUSD = expenses
      .filter(e => e.currency === 'USD')
      .reduce((sum, e) => sum + e.amount, 0);

    // Group by category
    const categoryMap = new Map();
    expenses.forEach(expense => {
      const key = expense.categoryId;
      if (!categoryMap.has(key)) {
        categoryMap.set(key, {
          categoryId: expense.categoryId,
          categoryName: expense.category.name,
          categoryColor: expense.category.color,
          categoryIcon: expense.category.icon,
          totalGTQ: 0,
          totalUSD: 0,
          count: 0,
        });
      }
      const category = categoryMap.get(key);
      if (expense.currency === 'GTQ') {
        category.totalGTQ += expense.amount;
      } else {
        category.totalUSD += expense.amount;
      }
      category.count += 1;
    });

    // Group by credit card
    const creditCardMap = new Map();
    expenses.forEach(expense => {
      if (expense.creditCardId && expense.creditCard) {
        const key = expense.creditCardId;
        if (!creditCardMap.has(key)) {
          creditCardMap.set(key, {
            creditCardId: expense.creditCardId,
            creditCardName: expense.creditCard.name,
            creditCardBank: expense.creditCard.bank,
            totalGTQ: 0,
            totalUSD: 0,
            count: 0,
          });
        }
        const creditCard = creditCardMap.get(key);
        if (expense.currency === 'GTQ') {
          creditCard.totalGTQ += expense.amount;
        } else {
          creditCard.totalUSD += expense.amount;
        }
        creditCard.count += 1;
      }
    });

    return {
      totalGTQ,
      totalUSD,
      count: expenses.length,
      byCategory: Array.from(categoryMap.values()),
      byCreditCard: Array.from(creditCardMap.values()),
    };
  }

  async validateCategoryExists(categoryId: string, userId: string): Promise<boolean> {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, userId },
    });
    return !!category;
  }

  async validateCreditCardExists(creditCardId: string, userId: string): Promise<boolean> {
    const creditCard = await prisma.creditCard.findFirst({
      where: { id: creditCardId, userId },
    });
    return !!creditCard;
  }

  async validateBudgetPeriodExists(budgetPeriodId: string, userId: string): Promise<boolean> {
    const budgetPeriod = await prisma.budgetPeriod.findFirst({
      where: { 
        id: budgetPeriodId,
        budget: {
          userId: userId,
        },
      },
    });
    return !!budgetPeriod;
  }
}