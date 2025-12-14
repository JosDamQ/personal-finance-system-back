import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";

import * as categoryController from "./category.controller";

const router = Router();

/**
 * GET /categories
 * Get all categories for authenticated user
 * Requires authentication
 */
router.get("/", authenticate, categoryController.getCategories);

/**
 * GET /categories/:id
 * Get specific category by ID
 * Requires authentication
 */
router.get("/:id", authenticate, categoryController.getCategoryById);

/**
 * POST /categories
 * Create new category
 * Requires authentication
 */
router.post("/", authenticate, categoryController.createCategory);

/**
 * PUT /categories/:id
 * Update existing category
 * Requires authentication
 */
router.put("/:id", authenticate, categoryController.updateCategory);

/**
 * DELETE /categories/:id
 * Delete category (reassigns expenses to default category)
 * Requires authentication
 */
router.delete("/:id", authenticate, categoryController.deleteCategory);

/**
 * POST /categories/initialize
 * Initialize default categories for user
 * Requires authentication
 */
router.post("/initialize", authenticate, categoryController.initializeCategories);

export default router;
