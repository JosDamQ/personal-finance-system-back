import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import authRoutes from "./modules/auth/auth.routes";
import userRoutes from "./modules/users/user.routes";
import categoryRoutes from "./modules/categories/category.routes";
import creditCardRoutes from "./modules/credit-cards/credit-card.routes";
import expenseRoutes from "./modules/expenses/expense.routes";
import { errorHandler } from "./middleware/errorHandler";

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(morgan("dev"));

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

// Error handler must be last
app.use(errorHandler);

export default app;
