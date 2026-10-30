import { Model } from 'mongoose';
import { Account, AccountBalanceDTO } from '../models/account.entity.js';
import { IAccountRepository } from './account.repository.interface.js';
import { AccountDocument, AccountModel } from '../models/account.mongoose.model.js';
import { ConflictError, InsufficientBalanceError, NotFoundError } from '../../../common/errors/index.js';

interface MongoErrorWithCode extends Error {
  code?: number;
}

export class MongoAccountRepository implements IAccountRepository {
  constructor(private readonly model: Model<AccountDocument> = AccountModel) {}

  async create(account: Account): Promise<Account> {
    try {
      const created = await this.model.create({
        _id: account.id,
        name: account.name,
        balance: account.balance,
        created_at: account.created_at,
      });

      return this.toDomain(created.toObject());
    } catch (error) {
      if ((error as MongoErrorWithCode).code === 11000) {
        throw new ConflictError(`Account with id '${account.id}' already exists`);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<Account | null> {
    const doc = await this.model
      .findById(id)
      .select({ _id: 1, name: 1, balance: 1, created_at: 1 })
      .lean<{ _id: string; name: string; balance: number; created_at: string }>()
      .exec();

    if (!doc) {
      return null;
    }

    return this.toDomain(doc);
  }

  async findBalanceById(id: string): Promise<AccountBalanceDTO | null> {
    const doc = await this.model
      .findById(id)
      .select({ _id: 1, balance: 1 })
      .lean<{ _id: string; balance: number }>()
      .exec();

    if (!doc) {
      return null;
    }

    return {
      accountId: doc._id,
      id: doc._id,
      balance: doc.balance,
    };
  }

  async findAll(): Promise<Account[]> {
    const docs = await this.model
      .find()
      .select({ _id: 1, name: 1, balance: 1, created_at: 1 })
      .sort({ created_at: -1 })
      .lean<Array<{ _id: string; name: string; balance: number; created_at: string }>>()
      .exec();

    return (docs || []).map((doc) => this.toDomain(doc));
  }

  async existsById(id: string): Promise<boolean> {
    const exists = await this.model.exists({ _id: id });
    return Boolean(exists);
  }

  async updateBalance(id: string, newBalance: number): Promise<Account> {
    if (newBalance < 0) {
      throw new InsufficientBalanceError(`Insufficient balance. Balance cannot be negative.`);
    }

    const doc = await this.model
      .findByIdAndUpdate(
        id,
        { $set: { balance: newBalance } },
        { new: true, runValidators: true }
      )
      .lean<{ _id: string; name: string; balance: number; created_at: string }>()
      .exec();

    if (!doc) {
      throw new NotFoundError(`Account with id '${id}' not found`);
    }

    return this.toDomain(doc);
  }

  async adjustBalance(id: string, amountDelta: number): Promise<Account> {
    // If debiting (negative delta), conditionally ensure balance is sufficient atomically
    if (amountDelta < 0) {
      const requiredAmount = Math.abs(amountDelta);
      const doc = await this.model
        .findOneAndUpdate(
          { _id: id, balance: { $gte: requiredAmount } },
          { $inc: { balance: amountDelta } },
          { new: true }
        )
        .lean<{ _id: string; name: string; balance: number; created_at: string }>()
        .exec();

      if (doc) {
        return this.toDomain(doc);
      }

      // Check if account existed but had insufficient balance, or didn't exist
      const existingAccount = await this.findById(id);
      if (!existingAccount) {
        throw new NotFoundError(`Account with id '${id}' not found`);
      }

      throw new InsufficientBalanceError(
        `Insufficient balance in account '${id}'. Current balance is ${existingAccount.balance}, requested debit is ${requiredAmount}.`
      );
    }

    // Crediting (positive delta)
    const doc = await this.model
      .findOneAndUpdate(
        { _id: id },
        { $inc: { balance: amountDelta } },
        { new: true }
      )
      .lean<{ _id: string; name: string; balance: number; created_at: string }>()
      .exec();

    if (!doc) {
      throw new NotFoundError(`Account with id '${id}' not found`);
    }

    return this.toDomain(doc);
  }

  async clear(): Promise<void> {
    await this.model.deleteMany({}).exec();
  }

  private toDomain(doc: { _id: string; name: string; balance: number; created_at: string }): Account {
    return {
      id: doc._id,
      name: doc.name,
      balance: doc.balance,
      created_at: doc.created_at,
    };
  }
}
