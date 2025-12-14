import { PrismaClient, Budget, BudgetPeriod, PaymentFrequency } from "@prisma/client";

import { CreateBudgetDto, UpdateBudgetDto } from "./budget.types";

const prisma = new PrismaClient();

export class BudgetRepository {
  async create(
    userId: string,
    data: CreateBudgetDto,
  ): Promise<Budget & { periods: BudgetPeriod[] }> {
    // Calcular el total de ingresos
    const totalIncome = data.periods.reduce((sum, period) => sum + period.income, 0);

    return prisma.budget.create({
      data: {
        userId,
        month: data.month,
        year: data.year,
        paymentFrequency: data.paymentFrequency as PaymentFrequency,
        totalIncome,
        periods: {
          create: data.periods.map((period) => ({
            periodNumber: period.periodNumber,
            income: period.income,
          })),
        },
      },
      include: {
        periods: {
          orderBy: { periodNumber: "asc" },
        },
      },
    });
  }

  async findByUserId(userId: string): Promise<(Budget & { periods: BudgetPeriod[] })[]> {
    return prisma.budget.findMany({
      where: { userId },
      include: {
        periods: {
          orderBy: { periodNumber: "asc" },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });
  }

  async findById(
    id: string,
    userId: string,
  ): Promise<(Budget & { periods: BudgetPeriod[] }) | null> {
    return prisma.budget.findFirst({
      where: { id, userId },
      include: {
        periods: {
          orderBy: { periodNumber: "asc" },
        },
      },
    });
  }

  async findByMonthYear(
    userId: string,
    month: number,
    year: number,
  ): Promise<(Budget & { periods: BudgetPeriod[] }) | null> {
    return prisma.budget.findFirst({
      where: { userId, month, year },
      include: {
        periods: {
          orderBy: { periodNumber: "asc" },
        },
      },
    });
  }

  async update(
    id: string,
    userId: string,
    data: UpdateBudgetDto,
  ): Promise<Budget & { periods: BudgetPeriod[] }> {
    // Si se están actualizando los períodos, recalcular el total
    let totalIncome: number | undefined;
    if (data.periods) {
      totalIncome = data.periods.reduce((sum, period) => sum + period.income, 0);
    }

    return prisma.$transaction(async (tx) => {
      // Actualizar el presupuesto principal
      const updatedBudget = await tx.budget.update({
        where: { id },
        data: {
          paymentFrequency: data.paymentFrequency as PaymentFrequency | undefined,
          totalIncome,
          updatedAt: new Date(),
        },
      });

      // Si se proporcionan períodos, actualizarlos
      if (data.periods) {
        // Eliminar períodos existentes
        await tx.budgetPeriod.deleteMany({
          where: { budgetId: id },
        });

        // Crear nuevos períodos
        await tx.budgetPeriod.createMany({
          data: data.periods.map((period) => ({
            budgetId: id,
            periodNumber: period.periodNumber,
            income: period.income,
          })),
        });
      }

      // Retornar el presupuesto actualizado con períodos
      return tx.budget.findUniqueOrThrow({
        where: { id },
        include: {
          periods: {
            orderBy: { periodNumber: "asc" },
          },
        },
      });
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    // Verificar que el presupuesto existe y pertenece al usuario
    const budget = await this.findById(id, userId);
    if (!budget) {
      throw new Error("Budget not found");
    }

    // Eliminar el presupuesto (los períodos se eliminan en cascada)
    await prisma.budget.delete({
      where: { id },
    });
  }

  async checkMonthYearExists(
    userId: string,
    month: number,
    year: number,
    excludeId?: string,
  ): Promise<boolean> {
    const budget = await prisma.budget.findFirst({
      where: {
        userId,
        month,
        year,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!budget;
  }

  async getBudgetWithExpenses(id: string, userId: string) {
    return prisma.budget.findFirst({
      where: { id, userId },
      include: {
        periods: {
          include: {
            expenses: {
              include: {
                category: true,
                creditCard: true,
              },
            },
          },
          orderBy: { periodNumber: "asc" },
        },
      },
    });
  }

  async getUserBudgetSummaries(userId: string) {
    const budgets = await prisma.budget.findMany({
      where: { userId },
      include: {
        periods: {
          include: {
            _count: {
              select: { expenses: true },
            },
            expenses: {
              select: { amount: true },
            },
          },
        },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    });

    return budgets.map((budget) => ({
      ...budget,
      totalExpenses: budget.periods.reduce(
        (sum, period) =>
          sum +
          period.expenses.reduce((periodSum, expense) => periodSum + expense.amount, 0),
        0,
      ),
      availableBalance:
        budget.totalIncome -
        budget.periods.reduce(
          (sum, period) =>
            sum +
            period.expenses.reduce((periodSum, expense) => periodSum + expense.amount, 0),
          0,
        ),
    }));
  }
}
