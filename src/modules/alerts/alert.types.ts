export interface CreateAlertDto {
  type: AlertType;
  title: string;
  message: string;
  metadata?: any;
}

export interface UpdateAlertDto {
  isRead?: boolean;
}

export interface AlertResponse {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  isRead: boolean;
  metadata?: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertFilters {
  isRead?: boolean;
  type?: AlertType;
  limit?: number;
  offset?: number;
}

export interface CreditLimitWarningMetadata {
  creditCardId: string;
  creditCardName: string;
  currency: "GTQ" | "USD";
  currentBalance: number;
  limit: number;
  percentage: number;
}

export interface BudgetExceededMetadata {
  budgetId: string;
  budgetPeriodId: string;
  month: number;
  year: number;
  periodNumber: number;
  totalIncome: number;
  totalExpenses: number;
  exceededAmount: number;
}

export interface PaymentReminderMetadata {
  creditCardId: string;
  creditCardName: string;
  bank: string;
  dueDate: Date;
  minimumPayment?: number;
}

export interface MonthlySummaryMetadata {
  month: number;
  year: number;
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  topCategories: Array<{
    categoryName: string;
    amount: number;
  }>;
}

export enum AlertType {
  CREDIT_LIMIT_WARNING = "CREDIT_LIMIT_WARNING",
  BUDGET_EXCEEDED = "BUDGET_EXCEEDED",
  PAYMENT_REMINDER = "PAYMENT_REMINDER",
  MONTHLY_SUMMARY = "MONTHLY_SUMMARY",
}
