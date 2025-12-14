import { Router } from "express";

import { authenticate } from "../../middleware/auth.middleware";
import {
  exportBudgetPdf,
  exportExpensesExcel,
  generateBudgetImage,
  backupUserData,
  downloadFile,
} from "./report.controller";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Export budget to PDF
router.post("/budget/:budgetId/pdf", exportBudgetPdf);

// Export expenses to Excel
router.post("/expenses/excel", exportExpensesExcel);

// Generate budget image
router.post("/budget/:budgetId/image", generateBudgetImage);

// Backup user data
router.post("/backup", backupUserData);

// Download exported file
router.get("/download/:fileName", downloadFile);

export default router;