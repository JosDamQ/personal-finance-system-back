import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { BudgetService } from "./budget.service";
import { CreateBudgetDto, UpdateBudgetDto } from "./budget.types";

const budgetService = new BudgetService();

export const getBudgets = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const budgets = await budgetService.getUserBudgets(userId);
    res.json({ success: true, data: budgets });
  } catch (error) {
    console.error('Error getting budgets:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get budgets' 
      } 
    });
  }
};

export const getBudgetById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const budget = await budgetService.getBudgetById(id, userId);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    console.error('Error getting budget:', error);
    
    if (error.message === 'Budget not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'BUDGET_NOT_FOUND', 
          message: 'Budget not found' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get budget' 
      } 
    });
  }
};

export const getBudgetByMonthYear = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { month, year } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (isNaN(monthNum) || isNaN(yearNum) || monthNum < 1 || monthNum > 12) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_INPUT', 
          message: 'Invalid month or year' 
        } 
      });
    }

    const budget = await budgetService.getBudgetByMonthYear(userId, monthNum, yearNum);
    
    if (!budget) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'BUDGET_NOT_FOUND', 
          message: 'Budget not found for specified month and year' 
        } 
      });
    }

    res.json({ success: true, data: budget });
  } catch (error) {
    console.error('Error getting budget by month/year:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get budget' 
      } 
    });
  }
};

export const createBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const budgetData: CreateBudgetDto = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    // Validaciones básicas
    if (!budgetData.month || !budgetData.year || !budgetData.paymentFrequency || !budgetData.periods) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'MISSING_REQUIRED_FIELD', 
          message: 'Month, year, payment frequency, and periods are required' 
        } 
      });
    }

    if (budgetData.month < 1 || budgetData.month > 12) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_INPUT', 
          message: 'Month must be between 1 and 12' 
        } 
      });
    }

    if (budgetData.year < 2000 || budgetData.year > 2100) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_INPUT', 
          message: 'Year must be between 2000 and 2100' 
        } 
      });
    }

    const budget = await budgetService.createBudget(userId, budgetData);
    res.status(201).json({ success: true, data: budget });
  } catch (error: any) {
    console.error('Error creating budget:', error);
    
    if (error.message === 'Budget for this month and year already exists') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'BUDGET_ALREADY_EXISTS', 
          message: 'Budget for this month and year already exists' 
        } 
      });
    }

    if (error.message.includes('Invalid payment frequency') || 
        error.message.includes('periods') || 
        error.message.includes('income must be positive')) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_INPUT', 
          message: error.message 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to create budget' 
      } 
    });
  }
};

export const updateBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const updateData: UpdateBudgetDto = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const budget = await budgetService.updateBudget(id, userId, updateData);
    res.json({ success: true, data: budget });
  } catch (error: any) {
    console.error('Error updating budget:', error);
    
    if (error.message === 'Budget not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'BUDGET_NOT_FOUND', 
          message: 'Budget not found' 
        } 
      });
    }

    if (error.message.includes('Invalid payment frequency') || 
        error.message.includes('periods') || 
        error.message.includes('income must be positive')) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_INPUT', 
          message: error.message 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to update budget' 
      } 
    });
  }
};

export const deleteBudget = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    await budgetService.deleteBudget(id, userId);
    res.json({ success: true, message: 'Budget deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting budget:', error);
    
    if (error.message === 'Budget not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'BUDGET_NOT_FOUND', 
          message: 'Budget not found' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to delete budget' 
      } 
    });
  }
};

export const copyFromPreviousMonth = async (req: AuthRequest, res: Response) => {
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

    if (month < 1 || month > 12) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_INPUT', 
          message: 'Month must be between 1 and 12' 
        } 
      });
    }

    const budget = await budgetService.copyFromPreviousMonth(userId, month, year);
    
    if (!budget) {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'PREVIOUS_BUDGET_NOT_FOUND', 
          message: 'No budget found for previous month to copy from' 
        } 
      });
    }

    res.status(201).json({ success: true, data: budget });
  } catch (error: any) {
    console.error('Error copying budget from previous month:', error);
    
    if (error.message === 'Budget for this month and year already exists') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'BUDGET_ALREADY_EXISTS', 
          message: 'Budget for this month and year already exists' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to copy budget from previous month' 
      } 
    });
  }
};