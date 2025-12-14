import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { CategoryService } from "./category.service";
import { CreateCategoryDto, UpdateCategoryDto } from "./category.types";

const categoryService = new CategoryService();

export const getCategories = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }

    const categories = await categoryService.getUserCategories(userId);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error getting categories:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to get categories' 
      } 
    });
  }
};

export const getCategoryById = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }

    const category = await categoryService.getCategoryById(id, userId);
    res.json({ success: true, data: category });
  } catch (error: any) {
    console.error('Error getting category:', error);
    
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
        message: 'Failed to get category' 
      } 
    });
  }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const categoryData: CreateCategoryDto = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }

    // Validaciones básicas
    if (!categoryData.name || categoryData.name.trim().length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'MISSING_REQUIRED_FIELD', 
          message: 'Category name is required' 
        } 
      });
    }

    const category = await categoryService.createCategory(userId, categoryData);
    res.status(201).json({ success: true, data: category });
  } catch (error: any) {
    console.error('Error creating category:', error);
    
    if (error.message === 'Category name already exists') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'CATEGORY_NAME_EXISTS', 
          message: 'Category name already exists' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to create category' 
      } 
    });
  }
};

export const updateCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;
    const updateData: UpdateCategoryDto = req.body;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }

    const category = await categoryService.updateCategory(id, userId, updateData);
    res.json({ success: true, data: category });
  } catch (error: any) {
    console.error('Error updating category:', error);
    
    if (error.message === 'Category not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'CATEGORY_NOT_FOUND', 
          message: 'Category not found' 
        } 
      });
    }

    if (error.message === 'Category name already exists') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'CATEGORY_NAME_EXISTS', 
          message: 'Category name already exists' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to update category' 
      } 
    });
  }
};

export const deleteCategory = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }

    await categoryService.deleteCategory(id, userId);
    res.json({ success: true, message: 'Category deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting category:', error);
    
    if (error.message === 'Category not found') {
      return res.status(404).json({ 
        success: false, 
        error: { 
          code: 'CATEGORY_NOT_FOUND', 
          message: 'Category not found' 
        } 
      });
    }

    if (error.message === 'Cannot delete default category') {
      return res.status(400).json({ 
        success: false, 
        error: { 
          code: 'CANNOT_DELETE_DEFAULT', 
          message: 'Cannot delete default category' 
        } 
      });
    }

    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to delete category' 
      } 
    });
  }
};

export const initializeCategories = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'User not authenticated' } });
    }

    const categories = await categoryService.initializeDefaultCategories(userId);
    res.json({ success: true, data: categories });
  } catch (error) {
    console.error('Error initializing categories:', error);
    res.status(500).json({ 
      success: false, 
      error: { 
        code: 'DATABASE_ERROR', 
        message: 'Failed to initialize categories' 
      } 
    });
  }
};