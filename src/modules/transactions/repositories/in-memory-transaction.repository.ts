import { Transaction, GetTransactionsQuery } from '../models/transaction.entity.js';
import { ITransactionRepository } from './transaction.repository.interface.js';
import { DuplicateTransactionError } from '../../../common/errors/index.js';

export class InMemoryTransactionRepository implements ITransactionRepository {
  private transactions: Map<string, Transaction> = new Map();

  async create(transaction: Transaction): Promise<Transaction> {
    const isDuplicate = Array.from(this.transactions.values()).some(
      (tx) => tx.accountId === transaction.accountId && tx.referenceId === transaction.referenceId
    );

    if (isDuplicate) {
      throw new DuplicateTransactionError(
        `Transaction with referenceId '${transaction.referenceId}' already exists for account '${transaction.accountId}'`
      );
    }

    this.transactions.set(transaction.id, { ...transaction });
    return { ...transaction };
  }

  async existsByReferenceId(accountId: string, referenceId: string): Promise<boolean> {
    return Array.from(this.transactions.values()).some(
      (tx) => tx.accountId === accountId && tx.referenceId === referenceId
    );
  }

  async deleteById(id: string): Promise<void> {
    this.transactions.delete(id);
  }

  async findByAccountId(
    accountId: string,
    query: GetTransactionsQuery = {}
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const all = Array.from(this.transactions.values()).filter(
      (tx) => tx.accountId === accountId
    );

    let filtered = all;
    if (query.type) {
      const normalizedType = query.type.toLowerCase();
      filtered = all.filter((tx) => tx.type.toLowerCase() === normalizedType);
    }

    // Sort by created date descending (latest first)
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    const total = filtered.length;
    const page = Math.max(1, query.page || 1);
    const pageSize = Math.max(1, query.pageSize || query.limit || 10);
    const startIndex = (page - 1) * pageSize;
    const paginated = filtered.slice(startIndex, startIndex + pageSize);

    return {
      transactions: paginated.map((tx) => ({ ...tx })),
      total,
    };
  }

  async clear(): Promise<void> {
    this.transactions.clear();
  }
}
