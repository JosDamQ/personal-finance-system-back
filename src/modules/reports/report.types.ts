export interface ExportBudgetPdfDto {
  budgetId: string;
  includeExpenses?: boolean;
}

export interface ExportExpensesExcelDto {
  startDate?: string;
  endDate?: string;
  categoryId?: string;
  creditCardId?: string;
}

export interface GenerateBudgetImageDto {
  budgetId: string;
  format?: 'png' | 'jpeg';
  width?: number;
  height?: number;
}

export interface BackupDataDto {
  includeHistorical?: boolean;
  format?: 'json' | 'excel';
}

export interface ExportResponse {
  success: boolean;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

export interface BudgetImageResponse {
  success: boolean;
  imageUrl: string;
  imageSize: number;
  format: string;
}

export interface BackupResponse {
  success: boolean;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  recordCount: {
    budgets: number;
    expenses: number;
    creditCards: number;
    categories: number;
  };
}