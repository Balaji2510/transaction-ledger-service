import { Account, AccountBalanceDTO } from '../models/account.entity.js';
import { IAccountRepository } from './account.repository.interface.js';
import { InsufficientBalanceError, NotFoundError } from '../../../common/errors/index.js';

export class InMemoryAccountRepository implements IAccountRepository {
  private accounts: Map<string, Account> = new Map();

  async create(account: Account): Promise<Account> {
    this.accounts.set(account.id, { ...account });
    return { ...account };
  }

  async findById(id: string): Promise<Account | null> {
    const account = this.accounts.get(id);
    if (!account) {
      return null;
    }
    return { ...account };
  }

  async findBalanceById(id: string): Promise<AccountBalanceDTO | null> {
    const account = this.accounts.get(id);
    if (!account) {
      return null;
    }
    return {
      accountId: account.id,
      id: account.id,
      balance: account.balance,
    };
  }

  async findAll(): Promise<Account[]> {
    return Array.from(this.accounts.values()).map(account => ({ ...account }));
  }

  async existsById(id: string): Promise<boolean> {
    return this.accounts.has(id);
  }

  async updateBalance(id: string, newBalance: number): Promise<Account> {
    const account = this.accounts.get(id);
    if (!account) {
      throw new NotFoundError(`Account with id '${id}' not found`);
    }
    if (newBalance < 0) {
      throw new InsufficientBalanceError(`Insufficient balance. Balance cannot be negative.`);
    }
    account.balance = Math.round(newBalance * 100) / 100;
    return { ...account };
  }

  async adjustBalance(id: string, amountDelta: number): Promise<Account> {
    const account = this.accounts.get(id);
    if (!account) {
      throw new NotFoundError(`Account with id '${id}' not found`);
    }
    const targetBalance = Math.round((account.balance + amountDelta) * 100) / 100;
    if (targetBalance < 0) {
      throw new InsufficientBalanceError(
        `Insufficient balance in account '${id}'. Current balance is ${account.balance}, requested debit is ${Math.abs(amountDelta)}.`
      );
    }
    account.balance = targetBalance;
    return { ...account };
  }

  async clear(): Promise<void> {
    this.accounts.clear();
  }
}

