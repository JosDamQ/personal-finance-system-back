import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import * as syncController from "./sync.controller";

const router = Router();

/**
 * POST /sync/queue
 * Add single item to sync queue
 * Requires authentication
 */
router.post("/queue", authenticate, syncController.addToSyncQueue);

/**
 * POST /sync/batch
 * Add multiple items to sync queue (batch sync)
 * Requires authentication
 */
router.post("/batch", authenticate, syncController.batchSync);

/**
 * POST /sync/process
 * Process pending sync queue items
 * Requires authentication
 */
router.post("/process", authenticate, syncController.processSyncQueue);

/**
 * GET /sync/status
 * Get sync status for user (pending, processing, failed counts)
 * Requires authentication
 */
router.get("/status", authenticate, syncController.getSyncStatus);

/**
 * GET /sync/conflicts
 * Get all unresolved conflicts for user
 * Requires authentication
 */
router.get("/conflicts", authenticate, syncController.getConflicts);

/**
 * POST /sync/conflicts/:conflictId/resolve
 * Resolve a specific conflict
 * Requires authentication
 */
router.post("/conflicts/:conflictId/resolve", authenticate, syncController.resolveConflict);

/**
 * POST /sync/conflicts/resolve-batch
 * Resolve multiple conflicts in batch
 * Requires authentication
 */
router.post("/conflicts/resolve-batch", authenticate, syncController.batchResolveConflicts);

/**
 * DELETE /sync/cleanup
 * Cleanup old completed sync items
 * Query param: days (default: 7)
 * Requires authentication
 */
router.delete("/cleanup", authenticate, syncController.cleanupSyncQueue);

export default router;