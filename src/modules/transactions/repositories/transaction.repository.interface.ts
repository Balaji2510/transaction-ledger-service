import { Transaction, GetTransactionsQuery } from '../models/transaction.entity.js';

export interface ITransactionRepository {
  create(transaction: Transaction): Promise<Transaction>;
  existsByReferenceId(accountId: string, referenceId: string): Promise<boolean>;
  findByAccountId(
    accountId: string,
    query?: GetTransactionsQuery
  ): Promise<{ transactions: Transaction[]; total: number }>;
  deleteById(id: string): Promise<void>;
  clear(): Promise<void>;
}
