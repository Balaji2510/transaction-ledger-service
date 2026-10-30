import { Account, AccountBalanceDTO } from '../models/account.entity.js';

export interface IAccountRepository {
  create(account: Account): Promise<Account>;
  findById(id: string): Promise<Account | null>;
  findBalanceById(id: string): Promise<AccountBalanceDTO | null>;
  findAll(): Promise<Account[]>;
  existsById(id: string): Promise<boolean>;
  updateBalance(id: string, newBalance: number): Promise<Account>;
  adjustBalance(id: string, amountDelta: number): Promise<Account>;
  clear(): Promise<void>;
}

