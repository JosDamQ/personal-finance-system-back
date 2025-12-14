import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { ExpenseService } from "./expense.service";
import { CreateExpenseDto, UpdateExpenseDto, ExpenseFilters } from "./expense.types";

const expenseService = new ExpenseService();

export const getExpenses = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    // Parse query parameters for filters
    const filters: ExpenseFilters = {};
    
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    
    if (req.query.categoryId) {
      filters.categoryId = req.query.categoryId as string;
    }
    
    if (req.query.creditCardId) {
      filters.creditCardId = req.query.creditCardId as string;
    }
    
    if (req.query.budgetPeriodId) {
      filters.budgetPeriodId = req.query.budgetPeriodId as string;
    }
    
    if (req.query.currency) {
      filters.currency = req.query.currency as 'GTQ' | 'USD';
    }
    
    if (req.query.minAmount) {
      filters.minAmount = parseFloat(req.query.minAmount as string);
    }
    
    if (req.query.maxAmount) {
      filters.maxAmount = parseFloat(req.query.maxAmount as string);
    }

    const expenses = await expenseService.getUserExpenses(userId, filters);
    res.json({ success: true, data: expenses });
  } catch (error) {
    console.error('Error getting expenses:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get expenses' 
      } 
    });
  }
};

export const getExpenseById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const expense = await expenseService.getExpenseById(id, userId);
    res.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('Error getting expense:', error);
    
    if (error.message === 'Expense not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'EXPENSE_NOT_FOUND', 
          message: 'Expense not found' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get expense' 
      } 
    });
  }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const expenseData: CreateExpenseDto = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    // Validaciones básicas
    if (!expenseData.categoryId) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'MISSING_REQUIRED_FIELD', 
          message: 'Category ID is required' 
        } 
      });
    }

    if (!expenseData.amount || expenseData.amount <= 0) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_INPUT', 
          message: 'Amount must be greater than 0' 
        } 
      });
    }

    if (!expenseData.currency || !['GTQ', 'USD'].includes(expenseData.currency)) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'INVALID_INPUT', 
          message: 'Currency must be GTQ or USD' 
        } 
      });
    }

    if (!expenseData.description || expenseData.description.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'MISSING_REQUIRED_FIELD', 
          message: 'Description is required' 
        } 
      });
    }

    if (!expenseData.date) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'MISSING_REQUIRED_FIELD', 
          message: 'Date is required' 
        } 
      });
    }

    // Convert date string to Date object
    expenseData.date = new Date(expenseData.date);

    const expense = await expenseService.createExpense(userId, expenseData);
    res.status(201).json({ success: true, data: expense });
  } catch (error: any) {
    console.error('Error creating expense:', error);
    
    if (error.message === 'Category not found') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'CATEGORY_NOT_FOUND', 
          message: 'Category not found' 
        } 
      });
    }

    if (error.message === 'Credit card not found') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'CREDIT_CARD_NOT_FOUND', 
          message: 'Credit card not found' 
        } 
      });
    }

    if (error.message === 'Budget period not found') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'BUDGET_PERIOD_NOT_FOUND', 
          message: 'Budget period not found' 
        } 
      });
    }

    if (error.message.includes('Amount must be') || 
        error.message.includes('Currency must be') ||
        error.message.includes('Description is required') ||
        error.message.includes('Valid date is required')) {
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
        message: 'Failed to create expense' 
      } 
    });
  }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const updateData: UpdateExpenseDto = req.body;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    // Convert date string to Date object if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const expense = await expenseService.updateExpense(id, userId, updateData);
    res.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('Error updating expense:', error);
    
    if (error.message === 'Expense not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'EXPENSE_NOT_FOUND', 
          message: 'Expense not found' 
        } 
      });
    }

    if (error.message === 'Category not found') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'CATEGORY_NOT_FOUND', 
          message: 'Category not found' 
        } 
      });
    }

    if (error.message === 'Credit card not found') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'CREDIT_CARD_NOT_FOUND', 
          message: 'Credit card not found' 
        } 
      });
    }

    if (error.message === 'Budget period not found') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'BUDGET_PERIOD_NOT_FOUND', 
          message: 'Budget period not found' 
        } 
      });
    }

    if (error.message.includes('Amount must be') || 
        error.message.includes('Currency must be')) {
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
        message: 'Failed to update expense' 
      } 
    });
  }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    await expenseService.deleteExpense(id, userId);
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting expense:', error);
    
    if (error.message === 'Expense not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'EXPENSE_NOT_FOUND', 
          message: 'Expense not found' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to delete expense' 
      } 
    });
  }
};

export const getExpensesByCreditCard = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { creditCardId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const expenses = await expenseService.getExpensesByCreditCard(creditCardId, userId);
    res.json({ success: true, data: expenses });
  } catch (error: any) {
    console.error('Error getting expenses by credit card:', error);
    
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
        message: 'Failed to get expenses by credit card' 
      } 
    });
  }
};

export const getExpensesByCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { categoryId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const expenses = await expenseService.getExpensesByCategory(categoryId, userId);
    res.json({ success: true, data: expenses });
  } catch (error: any) {
    console.error('Error getting expenses by category:', error);
    
    if (error.message === 'Category not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'CATEGORY_NOT_FOUND', 
          message: 'Category not found' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get expenses by category' 
      } 
    });
  }
};

export const getExpensesByBudgetPeriod = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { budgetPeriodId } = req.params;

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    const expenses = await expenseService.getExpensesByBudgetPeriod(budgetPeriodId, userId);
    res.json({ success: true, data: expenses });
  } catch (error: any) {
    console.error('Error getting expenses by budget period:', error);
    
    if (error.message === 'Budget period not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'BUDGET_PERIOD_NOT_FOUND', 
          message: 'Budget period not found' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get expenses by budget period' 
      } 
    });
  }
};

export const getExpensesSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } 
      });
    }

    // Parse query parameters for filters
    const filters: ExpenseFilters = {};
    
    if (req.query.startDate) {
      filters.startDate = new Date(req.query.startDate as string);
    }
    
    if (req.query.endDate) {
      filters.endDate = new Date(req.query.endDate as string);
    }
    
    if (req.query.categoryId) {
      filters.categoryId = req.query.categoryId as string;
    }
    
    if (req.query.creditCardId) {
      filters.creditCardId = req.query.creditCardId as string;
    }
    
    if (req.query.budgetPeriodId) {
      filters.budgetPeriodId = req.query.budgetPeriodId as string;
    }
    
    if (req.query.currency) {
      filters.currency = req.query.currency as 'GTQ' | 'USD';
    }
    
    if (req.query.minAmount) {
      filters.minAmount = parseFloat(req.query.minAmount as string);
    }
    
    if (req.query.maxAmount) {
      filters.maxAmount = parseFloat(req.query.maxAmount as string);
    }

    const summary = await expenseService.getExpensesSummary(userId, filters);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error('Error getting expenses summary:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get expenses summary' 
      } 
    });
  }
};