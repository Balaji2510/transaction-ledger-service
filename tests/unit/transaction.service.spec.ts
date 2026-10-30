import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionService } from '../../src/modules/transactions/services/transaction.service.js';
import { InMemoryTransactionRepository } from '../../src/modules/transactions/repositories/in-memory-transaction.repository.js';
import { InMemoryAccountRepository } from '../../src/modules/accounts/repositories/in-memory-account.repository.js';
import {
  BadRequestError,
  DuplicateTransactionError,
  InsufficientBalanceError,
  NotFoundError,
} from '../../src/common/errors/index.js';

describe('TransactionService Unit Tests', () => {
  let transactionRepo: InMemoryTransactionRepository;
  let accountRepo: InMemoryAccountRepository;
  let service: TransactionService;

  const validAccountId = 'acc_test_100';

  beforeEach(async () => {
    transactionRepo = new InMemoryTransactionRepository();
    accountRepo = new InMemoryAccountRepository();
    service = new TransactionService(transactionRepo, accountRepo);

    // Create a base account
    await accountRepo.create({
      id: validAccountId,
      name: 'Test User',
      balance: 1000,
      created_at: '2026-10-30T00:00:00.000Z',
    });
  });

  describe('getTransactionHistory', () => {
    it('should throw NotFoundError if account does not exist', async () => {
      await expect(
        service.getTransactionHistory('non_existent_account')
      ).rejects.toThrow(NotFoundError);
      await expect(
        service.getTransactionHistory('non_existent_account')
      ).rejects.toThrow("Account with id 'non_existent_account' not found");
    });

    it('should throw BadRequestError if account ID is empty', async () => {
      await expect(service.getTransactionHistory('')).rejects.toThrow(BadRequestError);
      await expect(service.getTransactionHistory('   ')).rejects.toThrow(BadRequestError);
    });

    it('should throw BadRequestError if invalid transaction type is provided', async () => {
      await expect(
        service.getTransactionHistory(validAccountId, { type: 'invalid_type' as any })
      ).rejects.toThrow(BadRequestError);
      await expect(
        service.getTransactionHistory(validAccountId, { type: 'invalid_type' as any })
      ).rejects.toThrow(/Invalid transaction type/i);
    });

    it('should return empty list with correct pagination when account has no transactions', async () => {
      const result = await service.getTransactionHistory(validAccountId);

      expect(result.transactions).toEqual([]);
      expect(result.pagination).toEqual({
        currentPage: 1,
        pageSize: 10,
        totalRecords: 0,
        totalPages: 0,
        page: 1,
        limit: 10,
        total: 0,
        hasNextPage: false,
        hasPrevPage: false,
      });
    });

    it('should return all credit and debit transactions sorted in latest first order when no type is provided', async () => {
      // Seed 3 transactions with different timestamps
      await transactionRepo.create({
        id: 'tx_1',
        accountId: validAccountId,
        type: 'credit',
        amount: 100,
        referenceId: 'ref_01',
        created_at: '2026-10-30T01:00:00.000Z',
      });
      await transactionRepo.create({
        id: 'tx_2',
        accountId: validAccountId,
        type: 'debit',
        amount: 40,
        referenceId: 'ref_02',
        created_at: '2026-10-30T03:00:00.000Z',
      });
      await transactionRepo.create({
        id: 'tx_3',
        accountId: validAccountId,
        type: 'credit',
        amount: 250,
        referenceId: 'ref_03',
        created_at: '2026-10-30T02:00:00.000Z',
      });

      const result = await service.getTransactionHistory(validAccountId);

      expect(result.transactions).toHaveLength(3);
      // Latest first: tx_2 (03:00) -> tx_3 (02:00) -> tx_1 (01:00)
      expect(result.transactions.map((t) => t.id)).toEqual(['tx_2', 'tx_3', 'tx_1']);
      expect(result.pagination.totalRecords).toBe(3);
      expect(result.pagination.totalPages).toBe(1);
    });

    it('should filter transactions by type: credit', async () => {
      await transactionRepo.create({
        id: 'tx_c1',
        accountId: validAccountId,
        type: 'credit',
        amount: 50,
        referenceId: 'ref_c1',
        created_at: '2026-10-30T01:00:00.000Z',
      });
      await transactionRepo.create({
        id: 'tx_d1',
        accountId: validAccountId,
        type: 'debit',
        amount: 20,
        referenceId: 'ref_d1',
        created_at: '2026-10-30T02:00:00.000Z',
      });
      await transactionRepo.create({
        id: 'tx_c2',
        accountId: validAccountId,
        type: 'credit',
        amount: 80,
        referenceId: 'ref_c2',
        created_at: '2026-10-30T03:00:00.000Z',
      });

      const result = await service.getTransactionHistory(validAccountId, { type: 'credit' });

      expect(result.transactions).toHaveLength(2);
      expect(result.transactions.every((t) => t.type === 'credit')).toBe(true);
      expect(result.transactions.map((t) => t.id)).toEqual(['tx_c2', 'tx_c1']);
      expect(result.pagination.totalRecords).toBe(2);
    });

    it('should filter transactions by type: debit', async () => {
      await transactionRepo.create({
        id: 'tx_c1',
        accountId: validAccountId,
        type: 'credit',
        amount: 50,
        referenceId: 'ref_c1',
        created_at: '2026-10-30T01:00:00.000Z',
      });
      await transactionRepo.create({
        id: 'tx_d1',
        accountId: validAccountId,
        type: 'debit',
        amount: 20,
        referenceId: 'ref_d1',
        created_at: '2026-10-30T02:00:00.000Z',
      });

      const result = await service.getTransactionHistory(validAccountId, { type: 'debit' });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].id).toBe('tx_d1');
      expect(result.transactions[0].type).toBe('debit');
      expect(result.pagination.totalRecords).toBe(1);
    });

    it('should properly paginate records across multiple pages', async () => {
      for (let i = 1; i <= 5; i++) {
        await transactionRepo.create({
          id: `tx_${i}`,
          accountId: validAccountId,
          type: 'credit',
          amount: i * 10,
          referenceId: `ref_pg_${i}`,
          created_at: `2026-10-30T0${i}:00:00.000Z`,
        });
      }

      // Page 1 with pageSize 2 (Latest first: tx_5, tx_4)
      const page1 = await service.getTransactionHistory(validAccountId, { page: 1, pageSize: 2 });
      expect(page1.transactions.map((t) => t.id)).toEqual(['tx_5', 'tx_4']);
      expect(page1.pagination.currentPage).toBe(1);
      expect(page1.pagination.pageSize).toBe(2);
      expect(page1.pagination.totalRecords).toBe(5);
      expect(page1.pagination.totalPages).toBe(3);
      expect(page1.pagination.hasNextPage).toBe(true);
      expect(page1.pagination.hasPrevPage).toBe(false);

      // Page 2 with pageSize 2 (tx_3, tx_2)
      const page2 = await service.getTransactionHistory(validAccountId, { page: 2, pageSize: 2 });
      expect(page2.transactions.map((t) => t.id)).toEqual(['tx_3', 'tx_2']);
      expect(page2.pagination.currentPage).toBe(2);
      expect(page2.pagination.hasNextPage).toBe(true);
      expect(page2.pagination.hasPrevPage).toBe(true);

      // Page 3 with pageSize 2 (tx_1)
      const page3 = await service.getTransactionHistory(validAccountId, { page: 3, pageSize: 2 });
      expect(page3.transactions.map((t) => t.id)).toEqual(['tx_1']);
      expect(page3.pagination.currentPage).toBe(3);
      expect(page3.pagination.hasNextPage).toBe(false);
      expect(page3.pagination.hasPrevPage).toBe(true);
    });
  });

  describe('recordTransaction & Balance Consistency', () => {
    it('should maintain exact balance consistency: initial 0, credit 100, credit 50, debit 30, debit 20 -> final 100', async () => {
      const cleanAcc = await accountRepo.create({
        id: 'acc_balance_consistency',
        name: 'Math Account',
        balance: 0,
        created_at: new Date().toISOString(),
      });

      // Credit 100
      await service.recordTransaction({
        accountId: cleanAcc.id,
        type: 'credit',
        amount: 100,
        referenceId: 'ref_c_100',
      });
      let balance = (await accountRepo.findBalanceById(cleanAcc.id))?.balance;
      expect(balance).toBe(100);

      // Credit 50
      await service.recordTransaction({
        accountId: cleanAcc.id,
        type: 'credit',
        amount: 50,
        referenceId: 'ref_c_50',
      });
      balance = (await accountRepo.findBalanceById(cleanAcc.id))?.balance;
      expect(balance).toBe(150);

      // Debit 30
      await service.recordTransaction({
        accountId: cleanAcc.id,
        type: 'debit',
        amount: 30,
        referenceId: 'ref_d_30',
      });
      balance = (await accountRepo.findBalanceById(cleanAcc.id))?.balance;
      expect(balance).toBe(120);

      // Debit 20
      await service.recordTransaction({
        accountId: cleanAcc.id,
        type: 'debit',
        amount: 20,
        referenceId: 'ref_d_20',
      });
      balance = (await accountRepo.findBalanceById(cleanAcc.id))?.balance;
      expect(balance).toBe(100);
    });

    it('should reject debit transaction with InsufficientBalanceError when balance is insufficient, leaving balance unchanged', async () => {
      const acc = await accountRepo.create({
        id: 'acc_insufficient',
        name: 'Poor Account',
        balance: 25,
        created_at: new Date().toISOString(),
      });

      await expect(
        service.recordTransaction({
          accountId: acc.id,
          type: 'debit',
          amount: 50,
          referenceId: 'ref_overdraft_fail',
        })
      ).rejects.toThrow(InsufficientBalanceError);

      const balance = (await accountRepo.findBalanceById(acc.id))?.balance;
      expect(balance).toBe(25);
    });

    it('should reject duplicate reference ID for the same account with DuplicateTransactionError and not alter balance', async () => {
      const acc = await accountRepo.create({
        id: 'acc_dup_test',
        name: 'Dup User',
        balance: 100,
        created_at: new Date().toISOString(),
      });

      await service.recordTransaction({
        accountId: acc.id,
        type: 'credit',
        amount: 50,
        referenceId: 'unique_ref_123',
      });

      await expect(
        service.recordTransaction({
          accountId: acc.id,
          type: 'credit',
          amount: 50,
          referenceId: 'unique_ref_123',
        })
      ).rejects.toThrow(DuplicateTransactionError);

      // Balance was only increased once
      const balance = (await accountRepo.findBalanceById(acc.id))?.balance;
      expect(balance).toBe(150);
    });

    it('should rollback account balance update if transaction persistence fails (Atomicity)', async () => {
      const acc = await accountRepo.create({
        id: 'acc_atomicity',
        name: 'Atomic User',
        balance: 200,
        created_at: new Date().toISOString(),
      });

      // Force transactionRepo.create to fail
      const originalCreate = transactionRepo.create.bind(transactionRepo);
      transactionRepo.create = async () => {
        throw new Error('Database write failure');
      };

      await expect(
        service.recordTransaction({
          accountId: acc.id,
          type: 'credit',
          amount: 100,
          referenceId: 'ref_atomic_fail',
        })
      ).rejects.toThrow('Database write failure');

      // Restore
      transactionRepo.create = originalCreate;

      // Balance must remain exactly 200 (rolled back)
      const balance = (await accountRepo.findBalanceById(acc.id))?.balance;
      expect(balance).toBe(200);
    });
  });

  describe('transferMoney (Bonus API)', () => {
    it('should transfer money from Account A (100) to Account B (50) with amount 30 -> A: 70, B: 80', async () => {
      const accA = await accountRepo.create({
        id: 'acc_transfer_A',
        name: 'Account A',
        balance: 100,
        created_at: new Date().toISOString(),
      });

      const accB = await accountRepo.create({
        id: 'acc_transfer_B',
        name: 'Account B',
        balance: 50,
        created_at: new Date().toISOString(),
      });

      const result = await service.transfer({
        fromAccountId: accA.id,
        toAccountId: accB.id,
        amount: 30,
        referenceId: 'ref_transfer_1',
      });

      expect(result.fromAccountBalance).toBe(70);
      expect(result.toAccountBalance).toBe(80);
      expect(result.amount).toBe(30);

      // Verify repository balances
      const balA = (await accountRepo.findBalanceById(accA.id))?.balance;
      const balB = (await accountRepo.findBalanceById(accB.id))?.balance;
      expect(balA).toBe(70);
      expect(balB).toBe(80);

      // Verify transaction records for both accounts
      const txA = await transactionRepo.findByAccountId(accA.id);
      const txB = await transactionRepo.findByAccountId(accB.id);
      expect(txA.transactions).toHaveLength(1);
      expect(txA.transactions[0].type).toBe('debit');
      expect(txA.transactions[0].amount).toBe(30);

      expect(txB.transactions).toHaveLength(1);
      expect(txB.transactions[0].type).toBe('credit');
      expect(txB.transactions[0].amount).toBe(30);
    });

    it('should fail transfer when source account has insufficient balance and rollback completely', async () => {
      const accA = await accountRepo.create({
        id: 'acc_fail_A',
        name: 'Account A',
        balance: 20,
        created_at: new Date().toISOString(),
      });

      const accB = await accountRepo.create({
        id: 'acc_fail_B',
        name: 'Account B',
        balance: 50,
        created_at: new Date().toISOString(),
      });

      await expect(
        service.transfer({
          fromAccountId: accA.id,
          toAccountId: accB.id,
          amount: 50,
          referenceId: 'ref_insufficient_tx',
        })
      ).rejects.toThrow(InsufficientBalanceError);

      // Neither account balance changed
      const balA = (await accountRepo.findBalanceById(accA.id))?.balance;
      const balB = (await accountRepo.findBalanceById(accB.id))?.balance;
      expect(balA).toBe(20);
      expect(balB).toBe(50);
    });

    it('should reject transfer when destination account does not exist', async () => {
      const accA = await accountRepo.create({
        id: 'acc_valid_A',
        name: 'Account A',
        balance: 100,
        created_at: new Date().toISOString(),
      });

      await expect(
        service.transfer({
          fromAccountId: accA.id,
          toAccountId: 'non_existent_dest',
          amount: 30,
          referenceId: 'ref_dest_fail',
        })
      ).rejects.toThrow(NotFoundError);

      const balA = (await accountRepo.findBalanceById(accA.id))?.balance;
      expect(balA).toBe(100);
    });

    it('should reject transfer to the same account', async () => {
      await expect(
        service.transfer({
          fromAccountId: validAccountId,
          toAccountId: validAccountId,
          amount: 50,
          referenceId: 'ref_self_transfer',
        })
      ).rejects.toThrow(BadRequestError);
    });
  });
});
