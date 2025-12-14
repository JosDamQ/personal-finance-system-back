import Ajv, { JSONSchemaType } from 'ajv';
import addFormats from 'ajv-formats';

import { UpdateProfileRequest, NotificationPreferences } from './user.types';

const ajv = new Ajv();
addFormats(ajv);

// Schema for updating user profile
const updateProfileSchema: JSONSchemaType<UpdateProfileRequest> = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      nullable: true,
      minLength: 1,
      maxLength: 100,
    },
    phone: {
      type: 'string',
      nullable: true,
      pattern: '^[+]?[0-9\\s\\-\\(\\)]{8,20}$',
    },
    defaultCurrency: {
      type: 'string',
      nullable: true,
      enum: ['GTQ', 'USD'],
    },
    theme: {
      type: 'string',
      nullable: true,
      enum: ['light', 'dark'],
    },
    notificationsCreditLimit: {
      type: 'boolean',
      nullable: true,
    },
    notificationsBudgetExceeded: {
      type: 'boolean',
      nullable: true,
    },
    notificationsPaymentReminder: {
      type: 'boolean',
      nullable: true,
    },
    notificationsMonthlySummary: {
      type: 'boolean',
      nullable: true,
    },
    notificationsEnabled: {
      type: 'boolean',
      nullable: true,
    },
  },
  additionalProperties: false,
  required: [],
};

// Schema for notification preferences
const notificationPreferencesSchema: JSONSchemaType<NotificationPreferences> = {
  type: 'object',
  properties: {
    creditLimit: {
      type: 'boolean',
    },
    budgetExceeded: {
      type: 'boolean',
    },
    paymentReminder: {
      type: 'boolean',
    },
    monthlySummary: {
      type: 'boolean',
    },
    enabled: {
      type: 'boolean',
    },
  },
  additionalProperties: false,
  required: ['creditLimit', 'budgetExceeded', 'paymentReminder', 'monthlySummary', 'enabled'],
};

export const validateUpdateProfile = ajv.compile(updateProfileSchema);
export const validateNotificationPreferences = ajv.compile(notificationPreferencesSchema);

// Validation helper functions
export const isValidCurrency = (currency: string): boolean => {
  return ['GTQ', 'USD'].includes(currency);
};

export const isValidTheme = (theme: string): boolean => {
  return ['light', 'dark'].includes(theme);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[+]?[0-9\s\-\(\)]{8,20}$/;
  return phoneRegex.test(phone);
};

export const sanitizeProfileData = (data: UpdateProfileRequest): UpdateProfileRequest => {
  const sanitized: UpdateProfileRequest = {};

  if (data.name !== undefined) {
    sanitized.name = data.name?.trim() || null;
  }

  if (data.phone !== undefined) {
    sanitized.phone = data.phone?.trim() || null;
  }

  if (data.defaultCurrency !== undefined) {
    sanitized.defaultCurrency = data.defaultCurrency;
  }

  if (data.theme !== undefined) {
    sanitized.theme = data.theme;
  }

  if (data.notificationsCreditLimit !== undefined) {
    sanitized.notificationsCreditLimit = data.notificationsCreditLimit;
  }

  if (data.notificationsBudgetExceeded !== undefined) {
    sanitized.notificationsBudgetExceeded = data.notificationsBudgetExceeded;
  }

  if (data.notificationsPaymentReminder !== undefined) {
    sanitized.notificationsPaymentReminder = data.notificationsPaymentReminder;
  }

  if (data.notificationsMonthlySummary !== undefined) {
    sanitized.notificationsMonthlySummary = data.notificationsMonthlySummary;
  }

  if (data.notificationsEnabled !== undefined) {
    sanitized.notificationsEnabled = data.notificationsEnabled;
  }

  return sanitized;
};