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

export default router;
