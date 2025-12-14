import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  deleteExpense,
  getExpensesByCreditCard,
  getExpensesByCategory,
  getExpensesByBudgetPeriod,
  getExpensesSummary,
} from "./expense.controller";

const router = Router();

// Rutas principales
router.get("/", authenticate, getExpenses);
router.post("/", authenticate, createExpense);
router.get("/summary", authenticate, getExpensesSummary);
router.get("/:id", authenticate, getExpenseById);
router.put("/:id", authenticate, updateExpense);
router.delete("/:id", authenticate, deleteExpense);

// Rutas de filtrado específico
router.get("/credit-card/:creditCardId", authenticate, getExpensesByCreditCard);
router.get("/category/:categoryId", authenticate, getExpensesByCategory);
router.get("/budget-period/:budgetPeriodId", authenticate, getExpensesByBudgetPeriod);

export default router;