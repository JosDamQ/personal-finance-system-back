export interface CreateExpenseDto {
  categoryId: string;
  creditCardId?: string;
  budgetPeriodId?: string;
  amount: number;
  currency: "GTQ" | "USD";
  description: string;
  date: Date;
}

export interface UpdateExpenseDto {
  categoryId?: string;
  creditCardId?: string;
  budgetPeriodId?: string;
  amount?: number;
  currency?: "GTQ" | "USD";
  description?: string;
  date?: Date;
}

export interface ExpenseResponse {
  id: string;
  categoryId: string;
  creditCardId?: string;
  budgetPeriodId?: string;
  amount: number;
  currency: "GTQ" | "USD";
  description: string;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  // Populated relations
  category?: {
    id: string;
    name: string;
    color: string;
    icon: string;
  };
  creditCard?: {
    id: string;
    name: string;
    bank: string;
  };
  budgetPeriod?: {
    id: string;
    periodNumber: number;
  };
}

export interface ExpenseFilters {
  startDate?: Date;
  endDate?: Date;
  categoryId?: string;
  creditCardId?: string;
  budgetPeriodId?: string;
  currency?: "GTQ" | "USD";
  minAmount?: number;
  maxAmount?: number;
}

export interface ExpenseSummary {
  totalGTQ: number;
  totalUSD: number;
  count: number;
  byCategory: Array<{
    categoryId: string;
    categoryName: string;
    totalGTQ: number;
    totalUSD: number;
    count: number;
  }>;
  byCreditCard: Array<{
    creditCardId: string;
    creditCardName: string;
    totalGTQ: number;
    totalUSD: number;
    count: number;
  }>;
}
