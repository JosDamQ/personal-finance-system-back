import { Response, NextFunction } from "express";
import userService from "./user.service";
import { ValidationError } from "../../utils/errors";
import type { UpdateUserDTO, UpdatePasswordDTO } from "./types";
import type { AuthRequest } from "../../middleware/auth.middleware";

/**
 * Get user profile
 * GET /users/me
 */
export async function getProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Ensure user is authenticated (middleware should have set req.user)
    if (!req.user) {
      throw new ValidationError("User not authenticated");
    }

    // Get userId from req.user (set by authenticate middleware)
    const userId = req.user.userId;

    // Call UserService getUserById method
    const user = await userService.getUserById(userId);

    // Return response in standard format
    res.status(200).json({
      status: "success",
      data: {
        user,
      },
      message: "User profile retrieved successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Update user profile
 * PUT /users/me
 */
export async function updateProfile(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Ensure user is authenticated (middleware should have set req.user)
    if (!req.user) {
      throw new ValidationError("User not authenticated");
    }

    // Get userId from req.user (set by authenticate middleware)
    const userId = req.user.userId;

    // Extract update data from request body
    const { name, phone, email } = req.body;

    const updateData: UpdateUserDTO = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (phone !== undefined) {
      updateData.phone = phone;
    }

    if (email !== undefined) {
      updateData.email = email;
    }

    // Call UserService updateUser method
    const updatedUser = await userService.updateUser(userId, updateData);

    // Return response in standard format
    res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
      message: "User profile updated successfully",
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Change user password
 * PATCH /users/password
 */
export async function changePassword(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    // Ensure user is authenticated (middleware should have set req.user)
    if (!req.user) {
      throw new ValidationError("User not authenticated");
    }

    // Get userId from req.user (set by authenticate middleware)
    const userId = req.user.userId;

    // Validate request body
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new ValidationError("Current password and new password are required");
    }

    // Validate new password length
    if (newPassword.length < 8) {
      throw new ValidationError("New password must be at least 8 characters long");
    }

    const passwordData: UpdatePasswordDTO = {
      currentPassword,
      newPassword,
    };

    // Call UserService updatePassword method
    const updatedUser = await userService.updatePassword(userId, passwordData);

    // Return response in standard format
    res.status(200).json({
      status: "success",
      data: {
        user: updatedUser,
      },
      message: "Password updated successfully",
    });
  } catch (error) {
    next(error);
  }
}
