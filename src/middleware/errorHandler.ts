import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  // Handle custom AppError instances
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: "error",
      message: err.message,
    });
  }

  // Handle Prisma errors
  if (err.name === "PrismaClientKnownRequestError") {
    // P2002: Unique constraint violation
    if (err.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "A record with this value already exists",
      });
    }
    // P2025: Record not found
    if (err.code === "P2025") {
      return res.status(404).json({
        status: "error",
        message: "Record not found",
      });
    }
  }

  // Handle JWT errors
  if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token",
    });
  }

  // Unknown errors - log and return generic message
  console.error("ERROR:", err);
  return res.status(500).json({
    status: "error",
    message: "Internal server error",
  });
};
