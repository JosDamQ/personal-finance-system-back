import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { AlertService } from "./alert.service";
import { CreateAlertDto, AlertFilters, AlertType } from "./alert.types";

const alertService = new AlertService();

export const getAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    // Construir filtros desde query parameters
    const filters: AlertFilters = {};
    
    if (req.query.isRead !== undefined) {
      filters.isRead = req.query.isRead === 'true';
    }
    
    if (req.query.type) {
      filters.type = req.query.type as AlertType;
    }
    
    if (req.query.limit) {
      filters.limit = parseInt(req.query.limit as string);
    }
    
    if (req.query.offset) {
      filters.offset = parseInt(req.query.offset as string);
    }

    const alerts = await alertService.getUserAlerts(userId, filters);
    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error('Error getting alerts:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get alerts' 
      } 
    });
  }
};

export const getAlertById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const alert = await alertService.getAlertById(id, userId);
    res.json({ success: true, data: alert });
  } catch (error: any) {
    console.error('Error getting alert:', error);
    
    if (error.message === 'Alert not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'ALERT_NOT_FOUND', 
          message: 'Alert not found' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get alert' 
      } 
    });
  }
};

export const createAlert = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const alertData: CreateAlertDto = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    // Validaciones básicas
    if (!alertData.type || !alertData.title || !alertData.message) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'MISSING_REQUIRED_FIELD', 
          message: 'Type, title, and message are required' 
        } 
      });
    }

    // Validar que el tipo de alerta sea válido
    if (!Object.values(AlertType).includes(alertData.type)) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_ALERT_TYPE', 
          message: 'Invalid alert type' 
        } 
      });
    }

    const alert = await alertService.createAlert(userId, alertData);
    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    console.error('Error creating alert:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to create alert' 
      } 
    });
  }
};

export const markAlertAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const alert = await alertService.markAlertAsRead(id, userId);
    res.json({ success: true, data: alert });
  } catch (error: any) {
    console.error('Error marking alert as read:', error);
    
    if (error.message === 'Alert not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'ALERT_NOT_FOUND', 
          message: 'Alert not found' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to mark alert as read' 
      } 
    });
  }
};

export const markAllAlertsAsRead = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const result = await alertService.markAllAlertsAsRead(userId);
    res.json({ 
      success: true, 
      data: result,
      message: `${result.count} alerts marked as read` 
    });
  } catch (error) {
    console.error('Error marking all alerts as read:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to mark alerts as read' 
      } 
    });
  }
};

export const deleteAlert = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    await alertService.deleteAlert(id, userId);
    res.json({ success: true, message: 'Alert deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting alert:', error);
    
    if (error.message === 'Alert not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'ALERT_NOT_FOUND', 
          message: 'Alert not found' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to delete alert' 
      } 
    });
  }
};

export const getUnreadCount = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const result = await alertService.getUnreadCount(userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting unread count:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get unread count' 
      } 
    });
  }
};

export const runAutomaticChecks = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const result = await alertService.runAutomaticAlertChecks(userId);
    res.json({ 
      success: true, 
      data: result,
      message: `Created ${result.creditLimitWarnings.length} credit limit warnings and ${result.budgetExceededAlerts.length} budget exceeded alerts`
    });
  } catch (error) {
    console.error('Error running automatic checks:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to run automatic checks' 
      } 
    });
  }
};

export const createPaymentReminder = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { creditCardId, dueDate, minimumPayment } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    if (!creditCardId || !dueDate) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'MISSING_REQUIRED_FIELD', 
          message: 'Credit card ID and due date are required' 
        } 
      });
    }

    const alert = await alertService.createPaymentReminder(
      userId, 
      creditCardId, 
      new Date(dueDate), 
      minimumPayment
    );
    
    res.status(201).json({ success: true, data: alert });
  } catch (error: any) {
    console.error('Error creating payment reminder:', error);
    
    if (error.message === 'Credit card not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'CREDIT_CARD_NOT_FOUND', 
          message: 'Credit card not found' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to create payment reminder' 
      } 
    });
  }
};

export const createMonthlySummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { month, year } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    if (!month || !year) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'MISSING_REQUIRED_FIELD', 
          message: 'Month and year are required' 
        } 
      });
    }

    const alert = await alertService.createMonthlySummary(userId, month, year);
    res.status(201).json({ success: true, data: alert });
  } catch (error) {
    console.error('Error creating monthly summary:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to create monthly summary' 
      } 
    });
  }
};

export const cleanupOldAlerts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { daysOld } = req.query;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const days = daysOld ? parseInt(daysOld as string) : 30;
    const result = await alertService.cleanupOldAlerts(userId, days);
    
    res.json({ 
      success: true, 
      data: result,
      message: `${result.deletedCount} old alerts deleted`
    });
  } catch (error) {
    console.error('Error cleaning up old alerts:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to cleanup old alerts' 
      } 
    });
  }
};

export const getNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const preferences = await alertService.getNotificationPreferences(userId);
    res.json({ success: true, data: preferences });
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get notification preferences' 
      } 
    });
  }
};

export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const preferences = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const updatedPreferences = await alertService.updateNotificationPreferences(userId, preferences);
    res.json({ 
      success: true, 
      data: updatedPreferences,
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to update notification preferences' 
      } 
    });
  }
};

export const testNotification = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { channel } = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    if (!channel || !['email', 'push', 'in_app'].includes(channel)) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_INPUT', 
          message: 'Valid channel (email, push, in_app) is required' 
        } 
      });
    }

    const result = await alertService.testNotification(userId, channel);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error testing notification:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to test notification' 
      } 
    });
  }
};