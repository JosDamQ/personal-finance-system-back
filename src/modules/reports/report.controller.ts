import { Response } from "express";

import { AuthRequest } from "../../middleware/auth.middleware";

import { ReportService } from "./report.service";
import {
  ExportBudgetPdfDto,
  ExportExpensesExcelDto,
  GenerateBudgetImageDto,
  BackupDataDto,
} from "./report.types";

const reportService = new ReportService();

export const exportBudgetPdf = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const { budgetId } = req.params;
    const { includeExpenses } = req.body;

    if (!budgetId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Budget ID is required",
        },
      });
    }

    const exportData: ExportBudgetPdfDto = {
      budgetId,
      includeExpenses: includeExpenses || false,
    };

    const result = await reportService.exportBudgetToPdf(userId, exportData);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error exporting budget to PDF:", error);

    if (error.message === "Budget not found") {
      return res.status(404).json({
        success: false,
        error: {
          code: "BUDGET_NOT_FOUND",
          message: "Budget not found",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "EXPORT_ERROR",
        message: "Failed to export budget to PDF",
      },
    });
  }
};

export const exportExpensesExcel = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const { startDate, endDate, categoryId, creditCardId } = req.body;

    const exportData: ExportExpensesExcelDto = {
      startDate,
      endDate,
      categoryId,
      creditCardId,
    };

    const result = await reportService.exportExpensesToExcel(userId, exportData);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error exporting expenses to Excel:", error);

    res.status(500).json({
      success: false,
      error: {
        code: "EXPORT_ERROR",
        message: "Failed to export expenses to Excel",
      },
    });
  }
};

export const generateBudgetImage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const { budgetId } = req.params;
    const { format, width, height } = req.body;

    if (!budgetId) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "Budget ID is required",
        },
      });
    }

    const imageData: GenerateBudgetImageDto = {
      budgetId,
      format: format || 'png',
      width: width || 800,
      height: height || 600,
    };

    const result = await reportService.generateBudgetImage(userId, imageData);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error generating budget image:", error);

    if (error.message === "Budget not found") {
      return res.status(404).json({
        success: false,
        error: {
          code: "BUDGET_NOT_FOUND",
          message: "Budget not found",
        },
      });
    }

    res.status(500).json({
      success: false,
      error: {
        code: "EXPORT_ERROR",
        message: "Failed to generate budget image",
      },
    });
  }
};

export const backupUserData = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: { code: "UNAUTHORIZED", message: "User not authenticated" },
      });
    }

    const { includeHistorical, format } = req.body;

    const backupData: BackupDataDto = {
      includeHistorical: includeHistorical || true,
      format: format || 'json',
    };

    const result = await reportService.backupUserData(userId, backupData);
    res.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Error creating backup:", error);

    res.status(500).json({
      success: false,
      error: {
        code: "BACKUP_ERROR",
        message: "Failed to create backup",
      },
    });
  }
};

export const downloadFile = async (req: AuthRequest, res: Response) => {
  try {
    const { fileName } = req.params;
    
    if (!fileName) {
      return res.status(400).json({
        success: false,
        error: {
          code: "MISSING_REQUIRED_FIELD",
          message: "File name is required",
        },
      });
    }

    const filePath = `exports/${fileName}`;
    
    // Security check: ensure file exists and is in exports directory
    const fs = require('fs');
    const path = require('path');
    const fullPath = path.join(process.cwd(), filePath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({
        success: false,
        error: {
          code: "FILE_NOT_FOUND",
          message: "File not found",
        },
      });
    }

    // Set appropriate headers based on file extension
    const ext = path.extname(fileName).toLowerCase();
    let contentType = 'application/octet-stream';
    
    switch (ext) {
      case '.pdf':
        contentType = 'application/pdf';
        break;
      case '.xlsx':
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;
      case '.json':
        contentType = 'application/json';
        break;
      case '.png':
        contentType = 'image/png';
        break;
      case '.jpg':
      case '.jpeg':
        contentType = 'image/jpeg';
        break;
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    
    res.sendFile(fullPath);
  } catch (error: any) {
    console.error("Error downloading file:", error);

    res.status(500).json({
      success: false,
      error: {
        code: "DOWNLOAD_ERROR",
        message: "Failed to download file",
      },
    });
  }
};