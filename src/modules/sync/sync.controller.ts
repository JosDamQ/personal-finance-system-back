import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { SyncService } from "./sync.service";
import {
  SyncQueueItemDto,
  BatchSyncDto,
  ConflictResolutionDto,
  BatchConflictResolutionDto,
} from "./sync.types";

const syncService = new SyncService();

export const addToSyncQueue = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const syncItem: SyncQueueItemDto = req.body;

    // Basic validation
    if (!syncItem.operation || !syncItem.entityType || !syncItem.entityId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Operation, entityType, and entityId are required",
        },
      });
    }

    const result = await syncService.addToSyncQueue(userId, syncItem);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error adding to sync queue:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to add item to sync queue",
      },
    });
  }
};

export const batchSync = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const batchData: BatchSyncDto = req.body;

    if (!batchData.items || !Array.isArray(batchData.items)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Items array is required",
        },
      });
    }

    // Validate each item
    for (const item of batchData.items) {
      if (!item.operation || !item.entityType || !item.entityId) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Each item must have operation, entityType, and entityId",
          },
        });
      }
    }

    const result = await syncService.batchAddToSyncQueue(userId, batchData.items);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    console.error("Error in batch sync:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to process batch sync",
      },
    });
  }
};

export const processSyncQueue = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const result = await syncService.processSyncQueue(userId);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error processing sync queue:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SYNC_ERROR",
        message: "Failed to process sync queue",
      },
    });
  }
};

export const getSyncStatus = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const status = await syncService.getSyncStatus(userId);
    res.json({ success: true, data: status });
  } catch (error) {
    console.error("Error getting sync status:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to get sync status",
      },
    });
  }
};

export const getConflicts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const conflicts = await syncService.getConflicts(userId);
    res.json({ success: true, data: conflicts });
  } catch (error) {
    console.error("Error getting conflicts:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to get conflicts",
      },
    });
  }
};

export const resolveConflict = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { conflictId } = req.params;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const resolution: ConflictResolutionDto = req.body;

    if (!resolution.resolution || !['LOCAL', 'REMOTE', 'MERGE'].includes(resolution.resolution)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Valid resolution type is required (LOCAL, REMOTE, or MERGE)",
        },
      });
    }

    if (resolution.resolution === 'MERGE' && !resolution.mergedData) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Merged data is required for MERGE resolution",
        },
      });
    }

    const result = await syncService.resolveConflict(userId, conflictId, resolution);
    res.json({ success: true, data: { resolved: result } });
  } catch (error: any) {
    console.error("Error resolving conflict:", error);

    if (error.message === "Conflict not found or access denied") {
      return res.status(404).json({
        success: false,
        error: {
          code: "CONFLICT_NOT_FOUND",
          message: "Conflict not found or access denied",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "SYNC_ERROR",
        message: "Failed to resolve conflict",
      },
    });
  }
};

export const batchResolveConflicts = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const batchResolution: BatchConflictResolutionDto = req.body;

    if (!batchResolution.resolutions || !Array.isArray(batchResolution.resolutions)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Resolutions array is required",
        },
      });
    }

    const results = [];
    const errors = [];

    for (const resolution of batchResolution.resolutions) {
      try {
        const result = await syncService.resolveConflict(
          userId,
          resolution.conflictId,
          resolution
        );
        results.push({ conflictId: resolution.conflictId, resolved: result });
      } catch (error) {
        console.error(`Error resolving conflict ${resolution.conflictId}:`, error);
        errors.push({
          conflictId: resolution.conflictId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      data: {
        resolved: results,
        errors: errors,
        totalProcessed: batchResolution.resolutions.length,
        successCount: results.length,
        errorCount: errors.length,
      },
    });
  } catch (error) {
    console.error("Error in batch conflict resolution:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "SYNC_ERROR",
        message: "Failed to process batch conflict resolution",
      },
    });
  }
};

export const cleanupSyncQueue = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const { days } = req.query;
    const daysOld = days ? parseInt(days as string) : 7;

    if (isNaN(daysOld) || daysOld < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Days must be a positive number",
        },
      });
    }

    const deletedCount = await syncService.cleanupOldSyncItems(userId, daysOld);
    res.json({
      success: true,
      data: {
        deletedCount,
        daysOld,
      },
    });
  } catch (error) {
    console.error("Error cleaning up sync queue:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to cleanup sync queue",
      },
    });
  }
};