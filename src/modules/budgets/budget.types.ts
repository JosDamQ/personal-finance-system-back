export interface CreateBudgetDto {
  month: number;
  year: number;
  paymentFrequency: 'BIWEEKLY' | 'MONTHLY';
  periods: CreateBudgetPeriodDto[];
}

export interface CreateBudgetPeriodDto {
  periodNumber: number;
  income: number;
}

export interface UpdateBudgetDto {
  paymentFrequency?: 'BIWEEKLY' | 'MONTHLY';
  periods?: UpdateBudgetPeriodDto[];
}

export interface UpdateBudgetPeriodDto {
  id?: string;
  periodNumber: number;
  income: number;
}

export interface BudgetResponse {
  id: string;
  month: number;
  year: number;
  paymentFrequency: 'BIWEEKLY' | 'MONTHLY';
  totalIncome: number;
  periods: BudgetPeriodResponse[];
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetPeriodResponse {
  id: string;
  periodNumber: number;
  income: number;
  totalExpenses: number;
  availableBalance: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetSummaryResponse {
  id: string;
  month: number;
  year: number;
  paymentFrequency: 'BIWEEKLY' | 'MONTHLY';
  totalIncome: number;
  totalExpenses: number;
  availableBalance: number;
  createdAt: Date;
  updatedAt: Date;
}