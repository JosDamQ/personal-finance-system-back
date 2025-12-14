import { Request, Response, NextFunction } from "express";
import authService from "./auth.service";
import { ValidationError } from "../../utils/errors";
import type { RegisterDTO, LoginDTO, OAuthDTO } from "./types";

/**
 * Register a new user
 * POST /auth/register
 */
export async function register(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate request body
    const { email, password, name, phone } = req.body;

    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    const registerData: RegisterDTO = {
      email,
      password,
      name,
      phone,
    };

    // Call AuthService register method
    const result = await authService.register(registerData);

    // Return response in standard format
    res.status(201).json({
      status: "success",
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
      message: "User registered successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Login with email and password
 * POST /auth/login
 */
export async function login(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate request body
    const { email, password } = req.body;

    if (!email || !password) {
      throw new ValidationError("Email and password are required");
    }

    const loginData: LoginDTO = {
      email,
      password,
    };

    // Call AuthService login method
    const result = await authService.login(loginData);

    // Return response in standard format
    res.status(200).json({
      status: "success",
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
      message: "User logged in successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * OAuth login with Google
 * POST /auth/oauth/google
 */
export async function oauthGoogle(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate request body
    const { idToken } = req.body;

    if (!idToken) {
      throw new ValidationError("ID token is required");
    }

    const oauthData: OAuthDTO = {
      idToken,
      provider: "google",
    };

    // Call AuthService oauthLogin method
    const result = await authService.oauthLogin(oauthData);

    // Return response in standard format
    res.status(200).json({
      status: "success",
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
      message: "User logged in with Google successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * OAuth login with Apple
 * POST /auth/oauth/apple
 */
export async function oauthApple(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate request body
    const { idToken } = req.body;

    if (!idToken) {
      throw new ValidationError("ID token is required");
    }

    const oauthData: OAuthDTO = {
      idToken,
      provider: "apple",
    };

    // Call AuthService oauthLogin method
    const result = await authService.oauthLogin(oauthData);

    // Return response in standard format
    res.status(200).json({
      status: "success",
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token
 * POST /auth/refresh
 */
export async function refresh(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Validate request body
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    // Call AuthService refreshToken method
    const tokens = await authService.refreshToken(refreshToken);

    // Return response in standard format
    res.status(200).json({
      status: "success",
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      },
      message: "Token refreshed successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Logout user
 * POST /auth/logout
 */
export async function logout(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Extract access token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new ValidationError("Access token is required");
    }

    const accessToken = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Validate request body
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new ValidationError("Refresh token is required");
    }

    // Call AuthService logout method
    await authService.logout(accessToken, refreshToken);

    // Return response in standard format
    res.status(200).json({
      status: "success",
      data: null,
      message: "Logged out successfully",
    });
  } catch (error) {
    next(error);
  }
}
