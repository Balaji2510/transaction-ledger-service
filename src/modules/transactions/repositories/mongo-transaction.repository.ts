import { Model } from 'mongoose';
import { Transaction, GetTransactionsQuery } from '../models/transaction.entity.js';
import { ITransactionRepository } from './transaction.repository.interface.js';
import { TransactionDocument, TransactionModel } from '../models/transaction.mongoose.model.js';
import { DuplicateTransactionError } from '../../../common/errors/index.js';

interface MongoErrorWithCode extends Error {
  code?: number;
}

export class MongoTransactionRepository implements ITransactionRepository {
  constructor(private readonly model: Model<TransactionDocument> = TransactionModel) {}

  async create(transaction: Transaction): Promise<Transaction> {
    try {
      const created = await this.model.create({
        _id: transaction.id,
        accountId: transaction.accountId,
        type: transaction.type,
        amount: transaction.amount,
        referenceId: transaction.referenceId,
        description: transaction.description || '',
        created_at: transaction.created_at,
      });

      return this.toDomain(created.toObject());
    } catch (error) {
      if ((error as MongoErrorWithCode).code === 11000) {
        throw new DuplicateTransactionError(
          `Transaction with referenceId '${transaction.referenceId}' already exists for account '${transaction.accountId}'`
        );
      }
      throw error;
    }
  }

  async existsByReferenceId(accountId: string, referenceId: string): Promise<boolean> {
    const exists = await this.model.exists({ accountId, referenceId });
    return Boolean(exists);
  }

  async deleteById(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }

  async findByAccountId(
    accountId: string,
    query: GetTransactionsQuery = {}
  ): Promise<{ transactions: Transaction[]; total: number }> {
    const filter: Record<string, unknown> = { accountId };
    if (query.type) {
      filter.type = query.type.toLowerCase();
    }
    if (query.referenceId) {
      filter.referenceId = query.referenceId.trim();
    }

    const page = Math.max(1, query.page || 1);
    const pageSize = Math.max(1, query.pageSize || query.limit || 10);
    const skip = (page - 1) * pageSize;

    const [docs, total] = await Promise.all([
      this.model
        .find(filter)
        .select({ _id: 1, accountId: 1, type: 1, amount: 1, referenceId: 1, description: 1, created_at: 1 })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(pageSize)
        .lean<Array<{ _id: string; accountId: string; type: string; amount: number; referenceId: string; description?: string; created_at: string }>>()
        .exec(),
      this.model.countDocuments(filter).exec(),
    ]);

    return {
      transactions: (docs || []).map((doc) => this.toDomain(doc)),
      total,
    };
  }

  async clear(): Promise<void> {
    await this.model.deleteMany({}).exec();
  }

  private toDomain(doc: {
    _id: string;
    accountId: string;
    type: string;
    amount: number;
    referenceId: string;
    description?: string;
    created_at: string;
  }): Transaction {
    return {
      id: doc._id,
      accountId: doc.accountId,
      type: doc.type as Transaction['type'],
      amount: doc.amount,
      referenceId: doc.referenceId,
      description: doc.description || '',
      created_at: doc.created_at,
    };
  }
}

