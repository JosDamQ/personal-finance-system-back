import { CreditCardService } from "../credit-cards/credit-card.service";
import { BudgetService } from "../budgets/budget.service";

import { AlertRepository } from "./alert.repository";
import { NotificationService } from "./notification.service";
import {
  CreateAlertDto,
  UpdateAlertDto,
  AlertResponse,
  AlertFilters,
  AlertType,
  CreditLimitWarningMetadata,
  BudgetExceededMetadata,
  PaymentReminderMetadata,
  MonthlySummaryMetadata,
} from "./alert.types";

export class AlertService {
  private alertRepository: AlertRepository;
  private creditCardService: CreditCardService;
  private budgetService: BudgetService;
  private notificationService: NotificationService;

  constructor() {
    this.alertRepository = new AlertRepository();
    this.creditCardService = new CreditCardService();
    this.budgetService = new BudgetService();
    this.notificationService = new NotificationService();
  }

  async createAlert(userId: string, data: CreateAlertDto): Promise<AlertResponse> {
    // Verificar si ya existe una alerta similar reciente para evitar duplicados
    const existingAlert = await this.alertRepository.findExistingAlert(
      userId,
      data.type,
      data.metadata,
    );
    if (existingAlert) {
      return this.mapToResponse(existingAlert);
    }

    const alert = await this.alertRepository.create(userId, data);

    // Enviar notificación si está configurado
    await this.notificationService.sendNotification(
      userId,
      data.type,
      data.title,
      data.message,
      data.metadata,
    );

    return this.mapToResponse(alert);
  }

  async getUserAlerts(userId: string, filters?: AlertFilters): Promise<AlertResponse[]> {
    const alerts = await this.alertRepository.findByUserId(userId, filters);
    return alerts.map(this.mapToResponse);
  }

  async getAlertById(id: string, userId: string): Promise<AlertResponse> {
    const alert = await this.alertRepository.findById(id, userId);
    if (!alert) {
      throw new Error("Alert not found");
    }
    return this.mapToResponse(alert);
  }

  async markAlertAsRead(id: string, userId: string): Promise<AlertResponse> {
    const alert = await this.alertRepository.findById(id, userId);
    if (!alert) {
      throw new Error("Alert not found");
    }

    const updatedAlert = await this.alertRepository.markAsRead(id, userId);
    return this.mapToResponse(updatedAlert);
  }

  async markAllAlertsAsRead(userId: string): Promise<{ count: number }> {
    const count = await this.alertRepository.markAllAsRead(userId);
    return { count };
  }

  async deleteAlert(id: string, userId: string): Promise<void> {
    await this.alertRepository.delete(id, userId);
  }

  async getUnreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.alertRepository.getUnreadCount(userId);
    return { count };
  }

  // Métodos para generar alertas automáticas

  async checkAndCreateCreditLimitWarnings(userId: string): Promise<AlertResponse[]> {
    const warnings = await this.creditCardService.getCardsNeedingWarnings(userId);
    const createdAlerts: AlertResponse[] = [];

    for (const warning of warnings) {
      const metadata: CreditLimitWarningMetadata = {
        creditCardId: warning.creditCard.id,
        creditCardName: warning.creditCard.name,
        currency: warning.currency,
        currentBalance:
          warning.currency === "GTQ"
            ? warning.creditCard.currentBalanceGTQ
            : warning.creditCard.currentBalanceUSD,
        limit:
          warning.currency === "GTQ"
            ? warning.creditCard.limitGTQ
            : warning.creditCard.limitUSD,
        percentage: warning.percentage,
      };

      const alertData: CreateAlertDto = {
        type: AlertType.CREDIT_LIMIT_WARNING,
        title: `Límite de crédito alcanzado - ${warning.creditCard.name}`,
        message: `Has utilizado ${warning.percentage.toFixed(1)}% del límite de tu tarjeta ${warning.creditCard.name} en ${warning.currency}. Límite: ${metadata.limit.toLocaleString()}, Usado: ${metadata.currentBalance.toLocaleString()}`,
        metadata,
      };

      const alert = await this.createAlert(userId, alertData);
      createdAlerts.push(alert);
    }

    return createdAlerts;
  }

  async checkAndCreateBudgetExceededAlert(
    userId: string,
    budgetPeriodId: string,
  ): Promise<AlertResponse | null> {
    try {
      // Obtener información del período de presupuesto y sus gastos
      const budgetPeriod = await this.getBudgetPeriodWithExpenses(budgetPeriodId, userId);
      if (!budgetPeriod) {
        return null;
      }

      // Calcular total de gastos
      const totalExpenses = budgetPeriod.expenses.reduce(
        (sum: number, expense: any) => sum + expense.amount,
        0,
      );

      // Verificar si se ha excedido el presupuesto
      if (totalExpenses > budgetPeriod.income) {
        const exceededAmount = totalExpenses - budgetPeriod.income;

        const metadata: BudgetExceededMetadata = {
          budgetId: budgetPeriod.budgetId,
          budgetPeriodId: budgetPeriod.id,
          month: budgetPeriod.budget.month,
          year: budgetPeriod.budget.year,
          periodNumber: budgetPeriod.periodNumber,
          totalIncome: budgetPeriod.income,
          totalExpenses,
          exceededAmount,
        };

        const alertData: CreateAlertDto = {
          type: AlertType.BUDGET_EXCEEDED,
          title: `Presupuesto excedido - ${this.getMonthName(budgetPeriod.budget.month)} ${budgetPeriod.budget.year}`,
          message: `Has excedido tu presupuesto del período ${budgetPeriod.periodNumber} por Q${exceededAmount.toLocaleString()}. Presupuesto: Q${budgetPeriod.income.toLocaleString()}, Gastado: Q${totalExpenses.toLocaleString()}`,
          metadata,
        };

        return this.createAlert(userId, alertData);
      }

      return null;
    } catch (error) {
      console.error("Error checking budget exceeded alert:", error);
      return null;
    }
  }

  async createPaymentReminder(
    userId: string,
    creditCardId: string,
    dueDate: Date,
    minimumPayment?: number,
  ): Promise<AlertResponse> {
    const creditCard = await this.creditCardService.getCreditCardById(
      creditCardId,
      userId,
    );

    const metadata: PaymentReminderMetadata = {
      creditCardId: creditCard.id,
      creditCardName: creditCard.name,
      bank: creditCard.bank,
      dueDate,
      minimumPayment,
    };

    const alertData: CreateAlertDto = {
      type: AlertType.PAYMENT_REMINDER,
      title: `Recordatorio de pago - ${creditCard.name}`,
      message: `Tu pago de la tarjeta ${creditCard.name} (${creditCard.bank}) vence el ${dueDate.toLocaleDateString()}${minimumPayment ? `. Pago mínimo: Q${minimumPayment.toLocaleString()}` : ""}`,
      metadata,
    };

    return this.createAlert(userId, alertData);
  }

  async createMonthlySummary(
    userId: string,
    month: number,
    year: number,
  ): Promise<AlertResponse> {
    // TODO: Implementar lógica para calcular resumen mensual
    // Por ahora, creamos un resumen básico

    const metadata: MonthlySummaryMetadata = {
      month,
      year,
      totalIncome: 0,
      totalExpenses: 0,
      totalSavings: 0,
      topCategories: [],
    };

    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];

    const alertData: CreateAlertDto = {
      type: AlertType.MONTHLY_SUMMARY,
      title: `Resumen mensual - ${monthNames[month - 1]} ${year}`,
      message: `Tu resumen financiero de ${monthNames[month - 1]} ${year} está listo. Revisa tus ingresos, gastos y ahorros del mes.`,
      metadata,
    };

    return this.createAlert(userId, alertData);
  }

  // Métodos de utilidad

  async cleanupOldAlerts(
    userId: string,
    daysOld: number = 30,
  ): Promise<{ deletedCount: number }> {
    const deletedCount = await this.alertRepository.deleteOldAlerts(userId, daysOld);
    return { deletedCount };
  }

  async getAlertsByType(userId: string, type: AlertType): Promise<AlertResponse[]> {
    const alerts = await this.alertRepository.getAlertsByType(userId, type);
    return alerts.map(this.mapToResponse);
  }

  // Métodos para gestión de preferencias de notificaciones

  async getNotificationPreferences(userId: string) {
    return this.notificationService.getUserNotificationPreferences(userId);
  }

  async updateNotificationPreferences(userId: string, preferences: any) {
    return this.notificationService.updateNotificationPreferences(userId, preferences);
  }

  async testNotification(userId: string, channel: "email" | "push" | "in_app") {
    return this.notificationService.testNotification(userId, channel);
  }

  // Método para ejecutar todas las verificaciones automáticas
  async runAutomaticAlertChecks(userId: string): Promise<{
    creditLimitWarnings: AlertResponse[];
    budgetExceededAlerts: AlertResponse[];
  }> {
    const creditLimitWarnings = await this.checkAndCreateCreditLimitWarnings(userId);

    // TODO: Implementar verificación de presupuestos excedidos
    const budgetExceededAlerts: AlertResponse[] = [];

    return {
      creditLimitWarnings,
      budgetExceededAlerts,
    };
  }

  private async getBudgetPeriodWithExpenses(
    budgetPeriodId: string,
    userId: string,
  ): Promise<any | null> {
    try {
      // Importar dinámicamente para evitar dependencias circulares
      const { PrismaClient } = await import("@prisma/client");
      const prisma = new PrismaClient();

      return await prisma.budgetPeriod.findFirst({
        where: {
          id: budgetPeriodId,
          budget: {
            userId,
          },
        },
        include: {
          budget: true,
          expenses: true,
        },
      });
    } catch (error) {
      console.error("Error getting budget period with expenses:", error);
      return null;
    }
  }

  private getMonthName(month: number): string {
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ];
    return monthNames[month - 1] || "Mes desconocido";
  }

  private mapToResponse(alert: any): AlertResponse {
    return {
      id: alert.id,
      type: alert.type,
      title: alert.title,
      message: alert.message,
      isRead: alert.isRead,
      metadata: alert.metadata,
      createdAt: alert.createdAt,
      updatedAt: alert.updatedAt,
    };
  }
}
