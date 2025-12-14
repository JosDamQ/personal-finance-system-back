import { PrismaClient, Alert, AlertType } from "@prisma/client";

import { CreateAlertDto, AlertFilters } from "./alert.types";

const prisma = new PrismaClient();

export class AlertRepository {
  async create(userId: string, data: CreateAlertDto): Promise<Alert> {
    return prisma.alert.create({
      data: {
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        metadata: data.metadata || null,
      },
    });
  }

  async findByUserId(userId: string, filters?: AlertFilters): Promise<Alert[]> {
    const where: any = { userId };

    if (filters?.isRead !== undefined) {
      where.isRead = filters.isRead;
    }

    if (filters?.type) {
      where.type = filters.type;
    }

    return prisma.alert.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters?.limit || 50,
      skip: filters?.offset || 0,
    });
  }

  async findById(id: string, userId: string): Promise<Alert | null> {
    return prisma.alert.findFirst({
      where: { id, userId },
    });
  }

  async markAsRead(id: string, userId: string): Promise<Alert> {
    return prisma.alert.update({
      where: { id },
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    });
  }

  async markAllAsRead(userId: string): Promise<number> {
    const result = await prisma.alert.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: {
        isRead: true,
        updatedAt: new Date(),
      },
    });

    return result.count;
  }

  async delete(id: string, userId: string): Promise<void> {
    // Verificar que la alerta existe y pertenece al usuario
    const alert = await this.findById(id, userId);
    if (!alert) {
      throw new Error("Alert not found");
    }

    await prisma.alert.delete({
      where: { id },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return prisma.alert.count({
      where: {
        userId,
        isRead: false,
      },
    });
  }

  async findExistingAlert(
    userId: string,
    type: AlertType,
    metadata?: any,
  ): Promise<Alert | null> {
    // Para evitar alertas duplicadas, buscar alertas similares recientes (últimas 24 horas)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const where: any = {
      userId,
      type,
      createdAt: {
        gte: oneDayAgo,
      },
    };

    // Para alertas de límite de crédito, verificar por tarjeta específica
    if (type === AlertType.CREDIT_LIMIT_WARNING && metadata?.creditCardId) {
      return prisma.alert.findFirst({
        where: {
          ...where,
          metadata: {
            path: ["creditCardId"],
            equals: metadata.creditCardId,
          },
        },
      });
    }

    // Para alertas de presupuesto excedido, verificar por período específico
    if (type === AlertType.BUDGET_EXCEEDED && metadata?.budgetPeriodId) {
      return prisma.alert.findFirst({
        where: {
          ...where,
          metadata: {
            path: ["budgetPeriodId"],
            equals: metadata.budgetPeriodId,
          },
        },
      });
    }

    // Para otros tipos, buscar por tipo solamente
    return prisma.alert.findFirst({
      where,
    });
  }

  async deleteOldAlerts(userId: string, daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.alert.deleteMany({
      where: {
        userId,
        createdAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  async getAlertsByType(userId: string, type: AlertType): Promise<Alert[]> {
    return prisma.alert.findMany({
      where: { userId, type },
      orderBy: { createdAt: "desc" },
    });
  }
}
