import { Request, Response, NextFunction } from "express";
import { AuthService } from "../modules/auth/auth.service";
import type { TokenPayload } from "../modules/auth/auth.types";

const authService = new AuthService();

/**
 * Extended Request interface with user payload
 */
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

/**
 * Authentication middleware
 */
export async function authenticate(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Extract token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({
        success: false,
        error: {
          code: "NO_TOKEN",
          message: "No token provided"
        }
      });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      res.status(401).json({
        success: false,
        error: {
          code: "NO_TOKEN",
          message: "No token provided"
        }
      });
      return;
    }

    // Verify token
    const payload = await authService.verifyAccessToken(token);

    // Add payload to req.user
    req.user = payload;

    next();
  } catch (error: any) {
    console.error("Authentication error:", error);

    res.status(401).json({
      success: false,
      error: {
        code: "INVALID_TOKEN",
        message: "Invalid or expired token"
      }
    });
  }
}
