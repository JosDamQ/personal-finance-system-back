import { Response } from "express";
import { AuthRequest } from "../../middleware/auth.middleware";
import { DashboardService } from "./dashboard.service";
import { DashboardFilters } from "./dashboard.types";

const dashboardService = new DashboardService();

export const getDashboardSummary = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const summary = await dashboardService.getDashboardSummary(userId);
    res.json({ success: true, data: summary });
  } catch (error) {
    console.error("Error getting dashboard summary:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to get dashboard summary",
      },
    });
  }
};

export const getMonthlyMetrics = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const { month, year } = req.params;
    
    let monthNum: number | undefined;
    let yearNum: number | undefined;

    if (month) {
      monthNum = parseInt(month);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Month must be between 1 and 12",
          },
        });
      }
    }

    if (year) {
      yearNum = parseInt(year);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Year must be between 2000 and 2100",
          },
        });
      }
    }

    const metrics = await dashboardService.getMonthlyMetrics(userId, monthNum, yearNum);
    res.json({ success: true, data: metrics });
  } catch (error: any) {
    console.error("Error getting monthly metrics:", error);

    if (error.message.includes("Month must be") || error.message.includes("Year must be")) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to get monthly metrics",
      },
    });
  }
};

export const getChartData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const { type } = req.params;
    const { startDate, endDate, month, year, currency } = req.query;

    // Validate chart type
    const validTypes = ['expenses-by-category', 'expenses-by-credit-card', 'monthly-trends', 'daily-expenses'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Invalid chart type. Must be one of: " + validTypes.join(", "),
        },
      });
    }

    // Parse filters
    const filters: DashboardFilters = {};

    if (startDate) {
      filters.startDate = new Date(startDate as string);
      if (isNaN(filters.startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid start date format",
          },
        });
      }
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
      if (isNaN(filters.endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid end date format",
          },
        });
      }
    }

    if (month) {
      const monthNum = parseInt(month as string);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Month must be between 1 and 12",
          },
        });
      }
      filters.month = monthNum;
    }

    if (year) {
      const yearNum = parseInt(year as string);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Year must be between 2000 and 2100",
          },
        });
      }
      filters.year = yearNum;
    }

    if (currency && !['GTQ', 'USD', 'ALL'].includes(currency as string)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Currency must be GTQ, USD, or ALL",
        },
      });
    }
    if (currency) {
      filters.currency = currency as 'GTQ' | 'USD' | 'ALL';
    }

    const chartData = await dashboardService.getChartData(
      userId,
      type as any,
      filters
    );

    res.json({ success: true, data: chartData });
  } catch (error: any) {
    console.error("Error getting chart data:", error);

    if (error.message === "Invalid chart type") {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: error.message,
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to get chart data",
      },
    });
  }
};

export const getExpensesTrends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const { startDate, endDate, month, year } = req.query;

    // Parse filters
    const filters: any = {};

    if (startDate) {
      filters.startDate = new Date(startDate as string);
      if (isNaN(filters.startDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid start date format",
          },
        });
      }
    }

    if (endDate) {
      filters.endDate = new Date(endDate as string);
      if (isNaN(filters.endDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Invalid end date format",
          },
        });
      }
    }

    if (month) {
      const monthNum = parseInt(month as string);
      if (isNaN(monthNum) || monthNum < 1 || monthNum > 12) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Month must be between 1 and 12",
          },
        });
      }
      filters.month = monthNum;
    }

    if (year) {
      const yearNum = parseInt(year as string);
      if (isNaN(yearNum) || yearNum < 2000 || yearNum > 2100) {
        return res.status(400).json({
          success: false,
          error: {
            code: "INVALID_INPUT",
            message: "Year must be between 2000 and 2100",
          },
        });
      }
      filters.year = yearNum;
    }

    const trends = await dashboardService.getExpensesTrends(userId, filters);
    res.json({ success: true, data: trends });
  } catch (error) {
    console.error("Error getting expenses trends:", error);
    res.status(500).json({
      success: false,
      error: {
        code: "DATABASE_ERROR",
        message: "Failed to get expenses trends",
      },
    });
  }
};