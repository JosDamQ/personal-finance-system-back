import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AuthenticationError, AuthorizationError } from "../utils/errors";
import authService from "../modules/auth/auth.service";
import type { TokenPayload } from "../modules/auth/types";

/**
 * Extended Request interface with user payload
 */
export interface AuthRequest extends Request {
  user?: TokenPayload;
}

/**
 * Authentication middleware
 *
 * Extracts and validates JWT token from Authorization header
 * Checks if token is blacklisted
 * Adds user payload to request object
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
      throw new AuthenticationError("No token provided");
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new AuthenticationError("No token provided");
    }

    // Check if token is blacklisted
    const isBlacklisted = await authService.isBlacklisted(token);

    if (isBlacklisted) {
      throw new AuthenticationError("Token has been revoked");
    }

    // Validate JWT token
    let payload: TokenPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError("Token has expired");
      }
      throw new AuthenticationError("Invalid token");
    }

    // Extract payload (userId, role, sessionId)
    if (!payload.userId || !payload.role || !payload.sessionId) {
      throw new AuthenticationError("Invalid token payload");
    }

    // Add payload to req.user
    req.user = {
      userId: payload.userId,
      role: payload.role,
      sessionId: payload.sessionId,
    };

    // Call next() if everything is valid
    next();
  } catch (error) {
    next(error);
  }
}

/**
 * Authorization middleware factory
 * Requirements: 8.1
 *
 * Verifies that the authenticated user has one of the required roles
 *
 * @param roles - Array of allowed roles
 * @returns Middleware function
 */
export function authorize(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    try {
      // Ensure user is authenticated first
      if (!req.user) {
        throw new AuthenticationError("Authentication required");
      }

      // Check if user has required role
      if (!roles.includes(req.user.role)) {
        throw new AuthorizationError("Insufficient permissions");
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}
