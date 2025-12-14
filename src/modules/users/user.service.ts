import prisma from '../../config/database';
import { 
  UserProfile, 
  UpdateProfileRequest, 
  UserConfiguration, 
  DEFAULT_USER_CONFIG,
  NotificationPreferences 
} from './user.types';
import { sanitizeProfileData } from './user.validation';

export class UserService {
  /**
   * Get user profile by ID
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        defaultCurrency: true,
        theme: true,
        notificationsCreditLimit: true,
        notificationsBudgetExceeded: true,
        notificationsPaymentReminder: true,
        notificationsMonthlySummary: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return user;
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, data: UpdateProfileRequest): Promise<UserProfile> {
    const sanitizedData = sanitizeProfileData(data);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(sanitizedData.name !== undefined && { name: sanitizedData.name }),
        ...(sanitizedData.phone !== undefined && { phone: sanitizedData.phone }),
        ...(sanitizedData.defaultCurrency !== undefined && { defaultCurrency: sanitizedData.defaultCurrency }),
        ...(sanitizedData.theme !== undefined && { theme: sanitizedData.theme }),
        ...(sanitizedData.notificationsCreditLimit !== undefined && { 
          notificationsCreditLimit: sanitizedData.notificationsCreditLimit 
        }),
        ...(sanitizedData.notificationsBudgetExceeded !== undefined && { 
          notificationsBudgetExceeded: sanitizedData.notificationsBudgetExceeded 
        }),
        ...(sanitizedData.notificationsPaymentReminder !== undefined && { 
          notificationsPaymentReminder: sanitizedData.notificationsPaymentReminder 
        }),
        ...(sanitizedData.notificationsMonthlySummary !== undefined && { 
          notificationsMonthlySummary: sanitizedData.notificationsMonthlySummary 
        }),
        ...(sanitizedData.notificationsEnabled !== undefined && { 
          notificationsEnabled: sanitizedData.notificationsEnabled 
        }),
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        defaultCurrency: true,
        theme: true,
        notificationsCreditLimit: true,
        notificationsBudgetExceeded: true,
        notificationsPaymentReminder: true,
        notificationsMonthlySummary: true,
        notificationsEnabled: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }

  /**
   * Get user configuration (currency, theme, notifications)
   */
  async getUserConfiguration(userId: string): Promise<UserConfiguration | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        defaultCurrency: true,
        theme: true,
        notificationsCreditLimit: true,
        notificationsBudgetExceeded: true,
        notificationsPaymentReminder: true,
        notificationsMonthlySummary: true,
        notificationsEnabled: true,
      },
    });

    if (!user) {
      return null;
    }

    return {
      defaultCurrency: user.defaultCurrency,
      theme: user.theme,
      notifications: {
        creditLimit: user.notificationsCreditLimit,
        budgetExceeded: user.notificationsBudgetExceeded,
        paymentReminder: user.notificationsPaymentReminder,
        monthlySummary: user.notificationsMonthlySummary,
        enabled: user.notificationsEnabled,
      },
    };
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    userId: string, 
    preferences: NotificationPreferences
  ): Promise<UserConfiguration> {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        notificationsCreditLimit: preferences.creditLimit,
        notificationsBudgetExceeded: preferences.budgetExceeded,
        notificationsPaymentReminder: preferences.paymentReminder,
        notificationsMonthlySummary: preferences.monthlySummary,
        notificationsEnabled: preferences.enabled,
      },
      select: {
        defaultCurrency: true,
        theme: true,
        notificationsCreditLimit: true,
        notificationsBudgetExceeded: true,
        notificationsPaymentReminder: true,
        notificationsMonthlySummary: true,
        notificationsEnabled: true,
      },
    });

    return {
      defaultCurrency: updatedUser.defaultCurrency,
      theme: updatedUser.theme,
      notifications: {
        creditLimit: updatedUser.notificationsCreditLimit,
        budgetExceeded: updatedUser.notificationsBudgetExceeded,
        paymentReminder: updatedUser.notificationsPaymentReminder,
        monthlySummary: updatedUser.notificationsMonthlySummary,
        enabled: updatedUser.notificationsEnabled,
      },
    };
  }

  /**
   * Reset user configuration to defaults
   */
  async resetUserConfiguration(userId: string): Promise<UserConfiguration> {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        defaultCurrency: DEFAULT_USER_CONFIG.defaultCurrency,
        theme: DEFAULT_USER_CONFIG.theme,
        notificationsCreditLimit: DEFAULT_USER_CONFIG.notifications.creditLimit,
        notificationsBudgetExceeded: DEFAULT_USER_CONFIG.notifications.budgetExceeded,
        notificationsPaymentReminder: DEFAULT_USER_CONFIG.notifications.paymentReminder,
        notificationsMonthlySummary: DEFAULT_USER_CONFIG.notifications.monthlySummary,
        notificationsEnabled: DEFAULT_USER_CONFIG.notifications.enabled,
      },
      select: {
        defaultCurrency: true,
        theme: true,
        notificationsCreditLimit: true,
        notificationsBudgetExceeded: true,
        notificationsPaymentReminder: true,
        notificationsMonthlySummary: true,
        notificationsEnabled: true,
      },
    });

    return {
      defaultCurrency: updatedUser.defaultCurrency,
      theme: updatedUser.theme,
      notifications: {
        creditLimit: updatedUser.notificationsCreditLimit,
        budgetExceeded: updatedUser.notificationsBudgetExceeded,
        paymentReminder: updatedUser.notificationsPaymentReminder,
        monthlySummary: updatedUser.notificationsMonthlySummary,
        enabled: updatedUser.notificationsEnabled,
      },
    };
  }

  /**
   * Check if user exists
   */
  async userExists(userId: string): Promise<boolean> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    return !!user;
  }
}