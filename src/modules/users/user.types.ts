export interface UserProfile {
  id: string;
  email: string;
  name: string | null;
  phone: string | null;
  defaultCurrency: string;
  theme: string;
  notificationsCreditLimit: boolean;
  notificationsBudgetExceeded: boolean;
  notificationsPaymentReminder: boolean;
  notificationsMonthlySummary: boolean;
  notificationsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateProfileRequest {
  name?: string | null;
  phone?: string | null;
  defaultCurrency?: string;
  theme?: string;
  notificationsCreditLimit?: boolean;
  notificationsBudgetExceeded?: boolean;
  notificationsPaymentReminder?: boolean;
  notificationsMonthlySummary?: boolean;
  notificationsEnabled?: boolean;
}

export interface NotificationPreferences {
  creditLimit: boolean;
  budgetExceeded: boolean;
  paymentReminder: boolean;
  monthlySummary: boolean;
  enabled: boolean;
}

export interface UserConfiguration {
  defaultCurrency: string;
  theme: string;
  notifications: NotificationPreferences;
}

export const DEFAULT_USER_CONFIG: UserConfiguration = {
  defaultCurrency: 'GTQ',
  theme: 'light',
  notifications: {
    creditLimit: true,
    budgetExceeded: true,
    paymentReminder: true,
    monthlySummary: true,
    enabled: true,
  },
};

export const VALID_CURRENCIES = ['GTQ', 'USD'] as const;
export const VALID_THEMES = ['light', 'dark'] as const;

export type Currency = typeof VALID_CURRENCIES[number];
export type Theme = typeof VALID_THEMES[number];