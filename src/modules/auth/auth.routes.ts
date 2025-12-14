import { Router } from "express";
import * as authController from "./auth.controller";
import { authenticate } from "../../middleware/auth.middleware";

const router = Router();

/**
 * POST /auth/register
 * Register a new user with email and password
 */
router.post("/register", authController.register);

/**
 * POST /auth/login
 * Login with email and password
 */
router.post("/login", authController.login);

/**
 * POST /auth/oauth/google
 * Login with Google OAuth
 */
router.post("/oauth/google", authController.oauthGoogle);

/**
 * POST /auth/oauth/apple
 * Login with Apple OAuth
 */
router.post("/oauth/apple", authController.oauthApple);

/**
 * POST /auth/refresh
 * Refresh access token using refresh token
 */
router.post("/refresh", authController.refresh);

/**
 * POST /auth/logout
 * Logout user and revoke tokens
 * Requires authentication
 */
router.post("/logout", authenticate, authController.logout);

export default router;
