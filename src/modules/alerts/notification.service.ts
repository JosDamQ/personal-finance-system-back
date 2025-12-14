import { AlertType } from "./alert.types";

export interface NotificationPreferences {
  creditLimitWarnings: boolean;
  budgetExceeded: boolean;
  paymentReminders: boolean;
  monthlySummary: boolean;
  emailNotifications: boolean;
  pushNotifications: boolean;
}

export interface NotificationChannel {
  type: 'email' | 'push' | 'in_app';
  enabled: boolean;
}

export class NotificationService {
  private defaultPreferences: NotificationPreferences = {
    creditLimitWarnings: true,
    budgetExceeded: true,
    paymentReminders: true,
    monthlySummary: true,
    emailNotifications: false, // Deshabilitado por defecto hasta implementar email
    pushNotifications: false,  // Deshabilitado por defecto hasta implementar push
  };

  async getUserNotificationPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      // Por ahora retornamos las preferencias por defecto
      // En el futuro, esto se puede almacenar en la base de datos
      return { ...this.defaultPreferences };
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      return { ...this.defaultPreferences };
    }
  }

  async updateNotificationPreferences(userId: string, preferences: Partial<NotificationPreferences>): Promise<NotificationPreferences> {
    try {
      // Por ahora solo validamos y retornamos las preferencias actualizadas
      // En el futuro, esto se puede almacenar en la base de datos
      const currentPreferences = await this.getUserNotificationPreferences(userId);
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      return updatedPreferences;
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }

  async shouldSendNotification(userId: string, alertType: AlertType): Promise<boolean> {
    try {
      const preferences = await this.getUserNotificationPreferences(userId);
      
      switch (alertType) {
        case AlertType.CREDIT_LIMIT_WARNING:
          return preferences.creditLimitWarnings;
        case AlertType.BUDGET_EXCEEDED:
          return preferences.budgetExceeded;
        case AlertType.PAYMENT_REMINDER:
          return preferences.paymentReminders;
        case AlertType.MONTHLY_SUMMARY:
          return preferences.monthlySummary;
        default:
          return true; // Por defecto, enviar notificaciones para tipos desconocidos
      }
    } catch (error) {
      console.error('Error checking notification preferences:', error);
      return true; // En caso de error, enviar la notificación
    }
  }

  async sendNotification(userId: string, alertType: AlertType, title: string, message: string, metadata?: any): Promise<void> {
    try {
      // Verificar si el usuario quiere recibir este tipo de notificación
      const shouldSend = await this.shouldSendNotification(userId, alertType);
      if (!shouldSend) {
        console.log(`Notification skipped for user ${userId}, type ${alertType} - disabled in preferences`);
        return;
      }

      const preferences = await this.getUserNotificationPreferences(userId);
      
      // Enviar notificación por email si está habilitado
      if (preferences.emailNotifications) {
        await this.sendEmailNotification(userId, title, message, metadata);
      }
      
      // Enviar notificación push si está habilitado
      if (preferences.pushNotifications) {
        await this.sendPushNotification(userId, title, message, metadata);
      }
      
      // Las notificaciones in-app siempre se crean (son las alertas en la base de datos)
      console.log(`In-app notification created for user ${userId}: ${title}`);
      
    } catch (error) {
      console.error('Error sending notification:', error);
      // No lanzar error para no bloquear la operación principal
    }
  }

  private async sendEmailNotification(userId: string, title: string, message: string, metadata?: any): Promise<void> {
    try {
      // TODO: Implementar envío de email
      // Por ahora solo loggeamos
      console.log(`Email notification for user ${userId}: ${title} - ${message}`);
      
      // Aquí se podría integrar con servicios como:
      // - SendGrid
      // - AWS SES
      // - Nodemailer con SMTP
      
    } catch (error) {
      console.error('Error sending email notification:', error);
    }
  }

  private async sendPushNotification(userId: string, title: string, message: string, metadata?: any): Promise<void> {
    try {
      // TODO: Implementar notificaciones push
      // Por ahora solo loggeamos
      console.log(`Push notification for user ${userId}: ${title} - ${message}`);
      
      // Aquí se podría integrar con servicios como:
      // - Firebase Cloud Messaging (FCM)
      // - Apple Push Notification Service (APNs)
      // - OneSignal
      
    } catch (error) {
      console.error('Error sending push notification:', error);
    }
  }

  async schedulePaymentReminders(userId: string): Promise<void> {
    try {
      // TODO: Implementar programación de recordatorios de pago
      // Esto podría usar un job scheduler como:
      // - node-cron
      // - Bull Queue
      // - Agenda.js
      
      console.log(`Payment reminders scheduled for user ${userId}`);
    } catch (error) {
      console.error('Error scheduling payment reminders:', error);
    }
  }

  async scheduleMonthlySummary(userId: string): Promise<void> {
    try {
      // TODO: Implementar programación de resúmenes mensuales
      // Esto se ejecutaría automáticamente el primer día de cada mes
      
      console.log(`Monthly summary scheduled for user ${userId}`);
    } catch (error) {
      console.error('Error scheduling monthly summary:', error);
    }
  }

  // Método para probar notificaciones
  async testNotification(userId: string, channel: 'email' | 'push' | 'in_app'): Promise<{ success: boolean; message: string }> {
    try {
      const testTitle = 'Notificación de prueba';
      const testMessage = 'Esta es una notificación de prueba del sistema de alertas.';
      
      switch (channel) {
        case 'email':
          await this.sendEmailNotification(userId, testTitle, testMessage);
          return { success: true, message: 'Test email notification sent' };
        case 'push':
          await this.sendPushNotification(userId, testTitle, testMessage);
          return { success: true, message: 'Test push notification sent' };
        case 'in_app':
          return { success: true, message: 'In-app notifications are always enabled' };
        default:
          return { success: false, message: 'Invalid notification channel' };
      }
    } catch (error) {
      console.error('Error sending test notification:', error);
      return { success: false, message: 'Failed to send test notification' };
    }
  }
}