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
app.use("/auth", authRoutes);
app.use("/users", userRoutes);
app.use("/categories", categoryRoutes);
app.use("/credit-cards", creditCardRoutes);
app.use("/expenses", expenseRoutes);
app.use("/budgets", budgetRoutes);
app.use("/alerts", alertRoutes);
app.use("/dashboard", dashboardRoutes);
app.use("/reports", reportRoutes);

// Error handler must be last
app.use(errorHandler);

export default app;
