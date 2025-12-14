import { Router } from "express";
import { authenticate } from "../../middleware/auth.middleware";
import {
  getDashboardSummary,
  getMonthlyMetrics,
  getChartData,
  getExpensesTrends,
} from "./dashboard.controller";

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticate);

// Dashboard summary - GET /dashboard/summary
router.get("/summary", getDashboardSummary);

// Monthly metrics - GET /dashboard/metrics/:month?/:year?
router.get("/metrics", getMonthlyMetrics);
router.get("/metrics/:month", getMonthlyMetrics);
router.get("/metrics/:month/:year", getMonthlyMetrics);

// Chart data - GET /dashboard/charts/:type
router.get("/charts/:type", getChartData);

// Expenses trends - GET /dashboard/trends
router.get("/trends", getExpensesTrends);

export default router;