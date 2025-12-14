import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";

import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import categoryRoutes from "./modules/categories/category.routes";
import creditCardRoutes from "./modules/credit-cards/credit-card.routes";
import expenseRoutes from "./modules/expenses/expense.routes";
import budgetRoutes from "./modules/budgets/budget.routes";
import alertRoutes from "./modules/alerts/alert.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import reportRoutes from "./modules/reports/report.routes";
import syncRoutes from "./modules/sync/sync.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(morgan("dev"));

// Serve static files from exports directory
app.use("/exports", express.static(path.join(process.cwd(), "exports")));

// Health check endpoint
app.get("/", (_req, res) => {
  res.json({ message: "UberEats Backend API Running 🚀" });
});

// API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/credit-cards", creditCardRoutes);
app.use("/api/v1/expenses", expenseRoutes);
app.use("/api/v1/budgets", budgetRoutes);
app.use("/api/v1/alerts", alertRoutes);
app.use("/api/v1/dashboard", dashboardRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/sync", syncRoutes);

// Error handler must be last
app.use(errorHandler);

export default app;
