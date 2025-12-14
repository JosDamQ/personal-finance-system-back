import { PrismaClient, CreditCard } from "@prisma/client";

const prisma = new PrismaClient();

export class CreditCardRepository {
  async create(userId: string, data: { 
    name: string; 
    bank: string; 
    limitGTQ: number; 
    limitUSD: number; 
  }): Promise<CreditCard> {
    return prisma.creditCard.create({
      data: {
        userId,
        name: data.name,
        bank: data.bank,
        limitGTQ: data.limitGTQ,
        limitUSD: data.limitUSD,
        currentBalanceGTQ: 0,
        currentBalanceUSD: 0,
        isActive: true,
      },
    });
  }

  async findByUserId(userId: string): Promise<CreditCard[]> {
    return prisma.creditCard.findMany({
      where: { userId },
      orderBy: [
        { isActive: 'desc' },
        { name: 'asc' }
      ],
    });
  }

  async findById(id: string, userId: string): Promise<CreditCard | null> {
    return prisma.creditCard.findFirst({
      where: { id, userId },
    });
  }

  async update(id: string, userId: string, data: { 
    name?: string; 
    bank?: string; 
    limitGTQ?: number; 
    limitUSD?: number; 
    isActive?: boolean;
  }): Promise<CreditCard> {
    return prisma.creditCard.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async updateBalance(id: string, userId: string, data: {
    currentBalanceGTQ?: number;
    currentBalanceUSD?: number;
  }): Promise<CreditCard> {
    return prisma.creditCard.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async delete(id: string, userId: string): Promise<void> {
    // Verificar que la tarjeta existe y pertenece al usuario
    const creditCard = await this.findById(id, userId);
    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    // Verificar si tiene gastos asociados
    const expenseCount = await prisma.expense.count({
      where: { creditCardId: id },
    });

    if (expenseCount > 0) {
      throw new Error('Cannot delete credit card with associated expenses');
    }

    await prisma.creditCard.delete({
      where: { id },
    });
  }

  async checkNameExists(userId: string, name: string, excludeId?: string): Promise<boolean> {
    const creditCard = await prisma.creditCard.findFirst({
      where: {
        userId,
        name,
        ...(excludeId && { id: { not: excludeId } }),
      },
    });
    return !!creditCard;
  }

  async getExpensesByCard(creditCardId: string, userId: string): Promise<any[]> {
    return prisma.expense.findMany({
      where: { 
        creditCardId,
        userId 
      },
      include: {
        category: {
          select: {
            name: true,
            color: true,
            icon: true,
          }
        }
      },
      orderBy: { date: 'desc' },
    });
  }

  async addExpenseToCard(creditCardId: string, amount: number, currency: 'GTQ' | 'USD'): Promise<void> {
    const creditCard = await prisma.creditCard.findUnique({
      where: { id: creditCardId },
    });

    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    const updateData = currency === 'GTQ' 
      ? { currentBalanceGTQ: creditCard.currentBalanceGTQ + amount }
      : { currentBalanceUSD: creditCard.currentBalanceUSD + amount };

    await prisma.creditCard.update({
      where: { id: creditCardId },
      data: updateData,
    });
  }

  async removeExpenseFromCard(creditCardId: string, amount: number, currency: 'GTQ' | 'USD'): Promise<void> {
    const creditCard = await prisma.creditCard.findUnique({
      where: { id: creditCardId },
    });

    if (!creditCard) {
      throw new Error('Credit card not found');
    }

    const updateData = currency === 'GTQ' 
      ? { currentBalanceGTQ: Math.max(0, creditCard.currentBalanceGTQ - amount) }
      : { currentBalanceUSD: Math.max(0, creditCard.currentBalanceUSD - amount) };

    await prisma.creditCard.update({
      where: { id: creditCardId },
      data: updateData,
    });
  }
}