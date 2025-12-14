import { Router } from "express";
import * as userController from "./user.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

/**
 * GET /users/me
 * Get authenticated user's profile
 * Requires authentication
 */
router.get("/me", authenticate, userController.getProfile);

/**
 * PUT /users/me
 * Update authenticated user's profile
 * Requires authentication
 */
router.put("/me", authenticate, userController.updateProfile);

/**
 * PATCH /users/password
 * Update authenticated user's profile
 * Requires authentication
 */
router.patch("/password", authenticate, userController.changePassword);

export default router;
