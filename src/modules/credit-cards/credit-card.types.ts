export interface CreateCreditCardDto {
  name: string;
  bank: string;
  limitGTQ: number;
  limitUSD: number;
}

export interface UpdateCreditCardDto {
  name?: string;
  bank?: string;
  limitGTQ?: number;
  limitUSD?: number;
  isActive?: boolean;
}

export interface CreditCardResponse {
  id: string;
  name: string;
  bank: string;
  limitGTQ: number;
  limitUSD: number;
  currentBalanceGTQ: number;
  currentBalanceUSD: number;
  availableBalanceGTQ: number;
  availableBalanceUSD: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreditCardBalanceUpdate {
  creditCardId: string;
  amountGTQ?: number;
  amountUSD?: number;
}
