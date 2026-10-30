export type TransactionType = 'credit' | 'debit';

export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  referenceId: string;
  description?: string;
  created_at: string;
}

export interface CreateTransactionDTO {
  id?: string;
  accountId: string;
  type: TransactionType;
  amount: number;
  referenceId: string;
  description?: string;
}

export interface GetTransactionsQuery {
  type?: TransactionType;
  referenceId?: string;
  page?: number;
  pageSize?: number;
  limit?: number;
}

export interface TransferDTO {
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  referenceId: string;
  description?: string;
}

export interface TransferResult {
  transferId: string;
  referenceId: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  fromAccountBalance: number;
  toAccountBalance: number;
  debitTransactionId: string;
  creditTransactionId: string;
  created_at: string;
}

