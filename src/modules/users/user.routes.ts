import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";

import * as userController from "./user.controller";

const router = Router();

/**
 * GET /users/me
 * Get authenticated user's profile
 */
router.get("/me", authenticate, userController.getProfile);

/**
 * PUT /users/me
 * Update authenticated user's profile
 */
router.put("/me", authenticate, userController.updateProfile);

/**
 * GET /users/me/configuration
 * Get user configuration (currency, theme, notifications)
 */
router.get("/me/configuration", authenticate, userController.getConfiguration);

/**
 * PUT /users/me/notifications
 * Update notification preferences
 */
router.put("/me/notifications", authenticate, userController.updateNotificationPreferences);

/**
 * POST /users/me/reset-configuration
 * Reset user configuration to defaults
 */
router.post("/me/reset-configuration", authenticate, userController.resetConfiguration);

export default router;
