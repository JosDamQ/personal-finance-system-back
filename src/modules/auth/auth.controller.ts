import { Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";

import { AuthService } from "./auth.service";
import type { RegisterRequest, LoginRequest, RefreshRequest } from "./auth.types";

const authService = new AuthService();

export const register = async (req: AuthRequest, res: Response) => {
  try {
    const data: RegisterRequest = req.body;

    // Basic validation
    if (!data.email || !data.password) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "Email and password are required",
        },
      });
    }

    if (data.password.length < 6) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_PASSWORD",
          message: "Password must be at least 6 characters",
        },
      });
    }

    const result = await authService.register(data);

    res.status(201).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Register error:", error);

    if (error.message === "Email already registered") {
      return res.status(409).json({
        success: false,
        error: {
          code: "EMAIL_EXISTS",
          message: "Email already registered",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Registration failed",
      },
    });
  }
};

export const login = async (req: AuthRequest, res: Response) => {
  try {
    const data: LoginRequest = req.body;

    // Basic validation
    if (!data.email || !data.password) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_FIELDS",
          message: "Email and password are required",
        },
      });
    }

    const result = await authService.login(data);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Login error:", error);

    if (error.message === "Invalid credentials") {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_CREDENTIALS",
          message: "Invalid email or password",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Login failed",
      },
    });
  }
};

export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken }: RefreshRequest = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Refresh token is required",
        },
      });
    }

    const tokens = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error: any) {
    console.error("Refresh token error:", error);

    if (error.message.includes("Invalid") || error.message.includes("expired")) {
      return res.status(401).json({
        success: false,
        error: {
          code: "INVALID_TOKEN",
          message: "Invalid or expired refresh token",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Token refresh failed",
      },
    });
  }
};

export const logout = async (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken }: RefreshRequest = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_TOKEN",
          message: "Refresh token is required",
        },
      });
    }

    await authService.logout(refreshToken);

    res.json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error: any) {
    console.error("Logout error:", error);

    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Logout failed",
      },
    });
  }
};
