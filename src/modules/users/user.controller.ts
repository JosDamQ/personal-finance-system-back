import { Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";
import { UserService } from "./user.service";
import { 
  validateUpdateProfile, 
  validateNotificationPreferences,
  isValidCurrency,
  isValidTheme 
} from "./user.validation";
import { UpdateProfileRequest, NotificationPreferences } from "./user.types";

const userService = new UserService();

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      });
    }

    const user = await userService.getUserProfile(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get profile",
      },
    });
  }
};

export const updateProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      });
    }

    // Validate request body
    const updateData: UpdateProfileRequest = req.body;
    
    if (!validateUpdateProfile(updateData)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid profile data",
          details: validateUpdateProfile.errors,
        },
      });
    }

    // Additional validation for specific fields
    if (updateData.defaultCurrency && !isValidCurrency(updateData.defaultCurrency)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_CURRENCY",
          message: "Invalid currency. Must be GTQ or USD",
        },
      });
    }

    if (updateData.theme && !isValidTheme(updateData.theme)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_THEME",
          message: "Invalid theme. Must be light or dark",
        },
      });
    }

    const updatedUser = await userService.updateUserProfile(userId, updateData);

    res.json({
      success: true,
      data: updatedUser,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update profile",
      },
    });
  }
};

export const getConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      });
    }

    const configuration = await userService.getUserConfiguration(userId);

    if (!configuration) {
      return res.status(404).json({
        success: false,
        error: {
          code: "USER_NOT_FOUND",
          message: "User not found",
        },
      });
    }

    res.json({
      success: true,
      data: configuration,
    });
  } catch (error) {
    console.error("Get configuration error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to get configuration",
      },
    });
  }
};

export const updateNotificationPreferences = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      });
    }

    const preferences: NotificationPreferences = req.body;

    if (!validateNotificationPreferences(preferences)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid notification preferences",
          details: validateNotificationPreferences.errors,
        },
      });
    }

    const updatedConfiguration = await userService.updateNotificationPreferences(userId, preferences);

    res.json({
      success: true,
      data: updatedConfiguration,
      message: "Notification preferences updated successfully",
    });
  } catch (error) {
    console.error("Update notification preferences error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update notification preferences",
      },
    });
  }
};

export const resetConfiguration = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "User not authenticated",
        },
      });
    }

    const defaultConfiguration = await userService.resetUserConfiguration(userId);

    res.json({
      success: true,
      data: defaultConfiguration,
      message: "Configuration reset to defaults successfully",
    });
  } catch (error) {
    console.error("Reset configuration error:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to reset configuration",
      },
    });
  }
};