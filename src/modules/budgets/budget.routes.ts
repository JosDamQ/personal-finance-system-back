import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getBudgets,
  getBudgetById,
  getBudgetByMonthYear,
  createBudget,
  updateBudget,
  deleteBudget,
  copyFromPreviousMonth,
} from "./budget.controller";

const router = Router();

// Rutas de presupuestos
router.get("/", authenticate, getBudgets);
router.get("/:id", authenticate, getBudgetById);
router.get("/month/:month/year/:year", authenticate, getBudgetByMonthYear);
router.post("/", authenticate, createBudget);
router.put("/:id", authenticate, updateBudget);
router.delete("/:id", authenticate, deleteBudget);
router.post("/copy-previous", authenticate, copyFromPreviousMonth);

export default router;