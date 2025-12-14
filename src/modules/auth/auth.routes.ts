import { Router } from "express";
import * as authController from "./auth.controller";

const router = Router();

/**
 * POST /auth/register
 * Register a new user
 */
router.post("/register", authController.register);

/**
 * POST /auth/login
 * Login with email and password
 */
router.post("/login", authController.login);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", authController.refreshToken);

/**
 * POST /auth/logout
 * Logout user and revoke refresh token
 */
router.post("/logout", authController.logout);

export default router;