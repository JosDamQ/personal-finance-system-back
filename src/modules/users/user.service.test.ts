import { UserService } from './user.service';
import { DEFAULT_USER_CONFIG } from './user.types';

// Mock the database module with jest.fn() directly
jest.mock('../../config/database', () => ({
  user: {
    findUnique: jest.fn(),
    update: jest.fn(),
  },
}));

// Import the mocked module
import prisma from '../../config/database';

// Type the mocked functions
const mockPrisma = prisma as {
  user: {
    findUnique: jest.MockedFunction<any>;
    update: jest.MockedFunction<any>;
  };
};

describe('UserService', () => {
  let userService: UserService;
  const mockUserId = 'test-user-id';

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should return user profile when user exists', async () => {
      const mockUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Test User',
        phone: '+502 1234-5678',
        defaultCurrency: 'GTQ',
        theme: 'light',
        notificationsCreditLimit: true,
        notificationsBudgetExceeded: true,
        notificationsPaymentReminder: true,
        notificationsMonthlySummary: true,
        notificationsEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getUserProfile(mockUserId);

      expect(result).toEqual(mockUser);
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUserId },
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
    });

    it('should return null when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.getUserProfile(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile with valid data', async () => {
      const updateData = {
        name: 'Updated Name',
        defaultCurrency: 'USD',
        notificationsEnabled: false,
      };

      const mockUpdatedUser = {
        id: mockUserId,
        email: 'test@example.com',
        name: 'Updated Name',
        phone: null,
        defaultCurrency: 'USD',
        theme: 'light',
        notificationsCreditLimit: true,
        notificationsBudgetExceeded: true,
        notificationsPaymentReminder: true,
        notificationsMonthlySummary: true,
        notificationsEnabled: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateUserProfile(mockUserId, updateData);

      expect(result).toEqual(mockUpdatedUser);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          name: 'Updated Name',
          defaultCurrency: 'USD',
          notificationsEnabled: false,
        },
        select: expect.any(Object),
      });
    });
  });

  describe('getUserConfiguration', () => {
    it('should return user configuration when user exists', async () => {
      const mockUser = {
        defaultCurrency: 'GTQ',
        theme: 'dark',
        notificationsCreditLimit: true,
        notificationsBudgetExceeded: false,
        notificationsPaymentReminder: true,
        notificationsMonthlySummary: true,
        notificationsEnabled: true,
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      const result = await userService.getUserConfiguration(mockUserId);

      expect(result).toEqual({
        defaultCurrency: 'GTQ',
        theme: 'dark',
        notifications: {
          creditLimit: true,
          budgetExceeded: false,
          paymentReminder: true,
          monthlySummary: true,
          enabled: true,
        },
      });
    });

    it('should return null when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.getUserConfiguration(mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences', async () => {
      const preferences = {
        creditLimit: false,
        budgetExceeded: true,
        paymentReminder: false,
        monthlySummary: true,
        enabled: true,
      };

      const mockUpdatedUser = {
        defaultCurrency: 'GTQ',
        theme: 'light',
        notificationsCreditLimit: false,
        notificationsBudgetExceeded: true,
        notificationsPaymentReminder: false,
        notificationsMonthlySummary: true,
        notificationsEnabled: true,
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.updateNotificationPreferences(mockUserId, preferences);

      expect(result).toEqual({
        defaultCurrency: 'GTQ',
        theme: 'light',
        notifications: preferences,
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          notificationsCreditLimit: false,
          notificationsBudgetExceeded: true,
          notificationsPaymentReminder: false,
          notificationsMonthlySummary: true,
          notificationsEnabled: true,
        },
        select: expect.any(Object),
      });
    });
  });

  describe('resetUserConfiguration', () => {
    it('should reset user configuration to defaults', async () => {
      const mockUpdatedUser = {
        defaultCurrency: DEFAULT_USER_CONFIG.defaultCurrency,
        theme: DEFAULT_USER_CONFIG.theme,
        notificationsCreditLimit: DEFAULT_USER_CONFIG.notifications.creditLimit,
        notificationsBudgetExceeded: DEFAULT_USER_CONFIG.notifications.budgetExceeded,
        notificationsPaymentReminder: DEFAULT_USER_CONFIG.notifications.paymentReminder,
        notificationsMonthlySummary: DEFAULT_USER_CONFIG.notifications.monthlySummary,
        notificationsEnabled: DEFAULT_USER_CONFIG.notifications.enabled,
      };

      mockPrisma.user.update.mockResolvedValue(mockUpdatedUser);

      const result = await userService.resetUserConfiguration(mockUserId);

      expect(result).toEqual(DEFAULT_USER_CONFIG);

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUserId },
        data: {
          defaultCurrency: DEFAULT_USER_CONFIG.defaultCurrency,
          theme: DEFAULT_USER_CONFIG.theme,
          notificationsCreditLimit: DEFAULT_USER_CONFIG.notifications.creditLimit,
          notificationsBudgetExceeded: DEFAULT_USER_CONFIG.notifications.budgetExceeded,
          notificationsPaymentReminder: DEFAULT_USER_CONFIG.notifications.paymentReminder,
          notificationsMonthlySummary: DEFAULT_USER_CONFIG.notifications.monthlySummary,
          notificationsEnabled: DEFAULT_USER_CONFIG.notifications.enabled,
        },
        select: expect.any(Object),
      });
    });
  });

  describe('userExists', () => {
    it('should return true when user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: mockUserId });

      const result = await userService.userExists(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await userService.userExists(mockUserId);

      expect(result).toBe(false);
    });
  });
});