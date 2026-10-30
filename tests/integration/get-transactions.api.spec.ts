import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app/app.js';
import { InMemoryAccountRepository } from '../../src/modules/accounts/repositories/in-memory-account.repository.js';
import { InMemoryTransactionRepository } from '../../src/modules/transactions/repositories/in-memory-transaction.repository.js';

describe('Transaction API Integration Tests (History, Creation, Immutability & Transfer)', () => {
  let accountRepo: InMemoryAccountRepository;
  let transactionRepo: InMemoryTransactionRepository;
  let app: ReturnType<typeof createApp>;

  const accountId = 'acc_user_hist_1';

  beforeEach(async () => {
    accountRepo = new InMemoryAccountRepository();
    transactionRepo = new InMemoryTransactionRepository();
    app = createApp({
      accountRepository: accountRepo,
      transactionRepository: transactionRepo,
    });

    // Create an account with balance 500
    await accountRepo.create({
      id: accountId,
      name: 'Transaction User',
      balance: 500,
      created_at: '2026-10-30T00:00:00.000Z',
    });
  });

  describe('GET /api/v1/accounts/:id/transactions', () => {
    it('should return empty transaction list with pagination metadata when no transactions exist', async () => {
      const response = await request(app).get(`/api/v1/accounts/${accountId}/transactions`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
      expect(response.body.meta).toMatchObject({
        currentPage: 1,
        pageSize: 10,
        totalRecords: 0,
        totalPages: 0,
      });
      expect(response.body.meta.timestamp).toBeDefined();
    });

    it('should return all credit and debit transactions sorted latest first when no type is provided', async () => {
      await transactionRepo.create({
        id: 'tx_oldest',
        accountId,
        type: 'credit',
        amount: 100,
        referenceId: 'ref_01',
        description: 'First deposit',
        created_at: '2026-10-30T08:00:00.000Z',
      });
      await transactionRepo.create({
        id: 'tx_latest',
        accountId,
        type: 'debit',
        amount: 25,
        referenceId: 'ref_02',
        description: 'Latest payment',
        created_at: '2026-10-30T10:00:00.000Z',
      });
      await transactionRepo.create({
        id: 'tx_middle',
        accountId,
        type: 'credit',
        amount: 50,
        referenceId: 'ref_03',
        description: 'Middle transfer',
        created_at: '2026-10-30T09:00:00.000Z',
      });

      const response = await request(app).get(`/api/v1/accounts/${accountId}/transactions`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(3);

      // Verify sorting: latest first based on created date
      expect(response.body.data[0].id).toBe('tx_latest');
      expect(response.body.data[1].id).toBe('tx_middle');
      expect(response.body.data[2].id).toBe('tx_oldest');

      // Verify pagination metadata
      expect(response.body.meta).toMatchObject({
        currentPage: 1,
        pageSize: 10,
        totalRecords: 3,
        totalPages: 1,
      });
    });

    it('should filter transactions by type: credit', async () => {
      await transactionRepo.create({
        id: 'tx_cred_1',
        accountId,
        type: 'credit',
        amount: 200,
        referenceId: 'ref_c1',
        created_at: '2026-10-30T08:00:00.000Z',
      });
      await transactionRepo.create({
        id: 'tx_deb_1',
        accountId,
        type: 'debit',
        amount: 50,
        referenceId: 'ref_d1',
        created_at: '2026-10-30T09:00:00.000Z',
      });
      await transactionRepo.create({
        id: 'tx_cred_2',
        accountId,
        type: 'credit',
        amount: 300,
        referenceId: 'ref_c2',
        created_at: '2026-10-30T10:00:00.000Z',
      });

      const response = await request(app).get(
        `/api/v1/accounts/${accountId}/transactions?type=credit`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every((tx: any) => tx.type === 'credit')).toBe(true);
      expect(response.body.data[0].id).toBe('tx_cred_2');
      expect(response.body.data[1].id).toBe('tx_cred_1');
      expect(response.body.meta.totalRecords).toBe(2);
    });

    it('should filter transactions by type: debit (case-insensitive)', async () => {
      await transactionRepo.create({
        id: 'tx_cred_1',
        accountId,
        type: 'credit',
        amount: 200,
        referenceId: 'ref_c1',
        created_at: '2026-10-30T08:00:00.000Z',
      });
      await transactionRepo.create({
        id: 'tx_deb_1',
        accountId,
        type: 'debit',
        amount: 50,
        referenceId: 'ref_d1',
        created_at: '2026-10-30T09:00:00.000Z',
      });

      const response = await request(app).get(
        `/api/v1/accounts/${accountId}/transactions?type=DEBIT`
      );

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].id).toBe('tx_deb_1');
      expect(response.body.data[0].type).toBe('debit');
      expect(response.body.meta.totalRecords).toBe(1);
    });

    it('should support pagination with currentPage, pageSize, totalRecords, totalPages', async () => {
      for (let i = 1; i <= 5; i++) {
        await transactionRepo.create({
          id: `tx_${i}`,
          accountId,
          type: i % 2 === 0 ? 'debit' : 'credit',
          amount: i * 20,
          referenceId: `ref_pg_${i}`,
          created_at: `2026-10-30T0${i}:00:00.000Z`,
        });
      }

      // Query Page 1 with pageSize 2
      const resPage1 = await request(app).get(
        `/api/v1/accounts/${accountId}/transactions?page=1&pageSize=2`
      );

      expect(resPage1.status).toBe(200);
      expect(resPage1.body.data).toHaveLength(2);
      expect(resPage1.body.data[0].id).toBe('tx_5'); // newest
      expect(resPage1.body.data[1].id).toBe('tx_4');
      expect(resPage1.body.meta).toMatchObject({
        currentPage: 1,
        pageSize: 2,
        totalRecords: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: false,
      });

      // Query Page 2 with pageSize 2
      const resPage2 = await request(app).get(
        `/api/v1/accounts/${accountId}/transactions?page=2&pageSize=2`
      );

      expect(resPage2.status).toBe(200);
      expect(resPage2.body.data).toHaveLength(2);
      expect(resPage2.body.data[0].id).toBe('tx_3');
      expect(resPage2.body.data[1].id).toBe('tx_2');
      expect(resPage2.body.meta).toMatchObject({
        currentPage: 2,
        pageSize: 2,
        totalRecords: 5,
        totalPages: 3,
        hasNextPage: true,
        hasPrevPage: true,
      });

      // Query Page 3 with limit alias
      const resPage3 = await request(app).get(
        `/api/v1/accounts/${accountId}/transactions?page=3&limit=2`
      );

      expect(resPage3.status).toBe(200);
      expect(resPage3.body.data).toHaveLength(1);
      expect(resPage3.body.data[0].id).toBe('tx_1');
      expect(resPage3.body.meta).toMatchObject({
        currentPage: 3,
        pageSize: 2,
        totalRecords: 5,
        totalPages: 3,
        hasNextPage: false,
        hasPrevPage: true,
      });
    });

    it('should return 404 when querying transactions for non-existent account', async () => {
      const response = await request(app).get(
        '/api/v1/accounts/non_existent_account_999/transactions'
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe(
        "Account with id 'non_existent_account_999' not found"
      );
    });

    it('should return 400 when an invalid transaction type is provided', async () => {
      const response = await request(app).get(
        `/api/v1/accounts/${accountId}/transactions?type=invalid_type`
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toMatch(
        /Invalid transaction type. Allowed values are 'credit' or 'debit'/i
      );
    });
  });

  describe('POST /api/v1/accounts/:id/transactions (Atomic Creation & Balance Consistency)', () => {
    it('should atomically record a credit transaction and increase account balance', async () => {
      const res = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'credit',
          amount: 250,
          referenceId: 'ref_cred_atom_1',
          description: 'Payroll deposit',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(250);
      expect(res.body.data.type).toBe('credit');
      expect(res.body.data.referenceId).toBe('ref_cred_atom_1');

      // Verify balance increased from 500 to 750
      const balRes = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
      expect(balRes.body.data.balance).toBe(750);
    });

    it('should atomically record a debit transaction and decrease account balance', async () => {
      const res = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'debit',
          amount: 150,
          referenceId: 'ref_deb_atom_1',
          description: 'Grocery bill',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(150);
      expect(res.body.data.type).toBe('debit');

      // Verify balance decreased from 500 to 350
      const balRes = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
      expect(balRes.body.data.balance).toBe(350);
    });

    it('should reject debit transaction with 400 and INSUFFICIENT_BALANCE when balance is insufficient, leaving balance unchanged', async () => {
      const res = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'debit',
          amount: 1000, // Account only has 500
          referenceId: 'ref_fail_insufficient',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');
      expect(res.body.error.message).toMatch(/Insufficient balance/i);

      // Verify balance remains exactly 500
      const balRes = await request(app).get(`/api/v1/accounts/${accountId}/balance`);
      expect(balRes.body.data.balance).toBe(500);
    });

    it('should reject duplicate reference ID with 409 Conflict', async () => {
      // First transaction
      await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'credit',
          amount: 50,
          referenceId: 'ref_dup_check_99',
        });

      // Second transaction with same reference ID
      const res = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'credit',
          amount: 50,
          referenceId: 'ref_dup_check_99',
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('DUPLICATE_TRANSACTION');
      expect(res.body.error.message).toMatch(/already exists for account/i);
    });

    it('should reject missing referenceId with 400 Bad Request', async () => {
      const res = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'credit',
          amount: 50,
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toMatch(/referenceId is required/i);
    });

    it('should reject negative or zero amount with 400 Bad Request', async () => {
      const res1 = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'credit',
          amount: 0,
          referenceId: 'ref_zero',
        });

      expect(res1.status).toBe(400);
      expect(res1.body.error.message).toMatch(/greater than 0/i);

      const res2 = await request(app)
        .post(`/api/v1/accounts/${accountId}/transactions`)
        .send({
          type: 'credit',
          amount: -50,
          referenceId: 'ref_neg',
        });

      expect(res2.status).toBe(400);
      expect(res2.body.error.message).toMatch(/greater than 0/i);
    });
  });

  describe('Transaction Immutability (PUT / PATCH / DELETE)', () => {
    it('should reject PUT /api/v1/accounts/:id/transactions with 405 Method Not Allowed', async () => {
      const res = await request(app).put(`/api/v1/accounts/${accountId}/transactions`).send({});
      expect(res.status).toBe(405);
      expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED');
      expect(res.body.error.message).toMatch(/Transactions are immutable/i);
    });

    it('should reject DELETE /api/v1/accounts/:id/transactions with 405 Method Not Allowed', async () => {
      const res = await request(app).delete(`/api/v1/accounts/${accountId}/transactions`);
      expect(res.status).toBe(405);
      expect(res.body.error.code).toBe('METHOD_NOT_ALLOWED');
    });
  });

  describe('POST /api/v1/accounts/transfer (Bonus Money Transfer API)', () => {
    it('should transfer money from Account A (100) to Account B (50) with amount 30 -> A: 70, B: 80', async () => {
      const accA = await accountRepo.create({
        id: 'acc_bonus_A',
        name: 'Account A',
        balance: 100,
        created_at: new Date().toISOString(),
      });
      const accB = await accountRepo.create({
        id: 'acc_bonus_B',
        name: 'Account B',
        balance: 50,
        created_at: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/v1/accounts/transfer')
        .send({
          fromAccountId: accA.id,
          toAccountId: accB.id,
          amount: 30,
          referenceId: 'ref_bonus_transfer_01',
          description: 'Payment for services',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toMatchObject({
        fromAccountId: accA.id,
        toAccountId: accB.id,
        amount: 30,
        fromAccountBalance: 70,
        toAccountBalance: 80,
      });

      // Verify updated balances via API
      const balA = await request(app).get(`/api/v1/accounts/${accA.id}/balance`);
      const balB = await request(app).get(`/api/v1/accounts/${accB.id}/balance`);
      expect(balA.body.data.balance).toBe(70);
      expect(balB.body.data.balance).toBe(80);
    });

    it('should reject transfer when source account has insufficient balance and rollback completely', async () => {
      const accA = await accountRepo.create({
        id: 'acc_short_A',
        name: 'Account A',
        balance: 20,
        created_at: new Date().toISOString(),
      });
      const accB = await accountRepo.create({
        id: 'acc_short_B',
        name: 'Account B',
        balance: 50,
        created_at: new Date().toISOString(),
      });

      const res = await request(app)
        .post('/api/v1/accounts/transfer')
        .send({
          fromAccountId: accA.id,
          toAccountId: accB.id,
          amount: 100,
          referenceId: 'ref_insufficient_transfer',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INSUFFICIENT_BALANCE');

      // Balances must remain strictly unchanged
      const balA = await request(app).get(`/api/v1/accounts/${accA.id}/balance`);
      const balB = await request(app).get(`/api/v1/accounts/${accB.id}/balance`);
      expect(balA.body.data.balance).toBe(20);
      expect(balB.body.data.balance).toBe(50);
    });

    it('should reject transfer to the same account with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/v1/accounts/transfer')
        .send({
          fromAccountId: accountId,
          toAccountId: accountId,
          amount: 50,
          referenceId: 'ref_self_tx',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('BAD_REQUEST');
      expect(res.body.error.message).toMatch(/cannot transfer money to the same account/i);
    });

    it('should reject transfer when destination account does not exist with 404 Not Found', async () => {
      const res = await request(app)
        .post('/api/v1/accounts/transfer')
        .send({
          fromAccountId: accountId,
          toAccountId: 'non_existent_dest_999',
          amount: 50,
          referenceId: 'ref_dest_not_found',
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
      expect(res.body.error.message).toMatch(/Destination account with id/i);
    });
  });

  describe('GET /api/v1/accounts (Pagination on List Accounts API)', () => {
    it('should return pagination metadata and sort accounts in latest first order', async () => {
      await accountRepo.create({
        id: 'acc_second',
        name: 'Second Account',
        balance: 0,
        created_at: '2026-10-30T02:00:00.000Z',
      });
      await accountRepo.create({
        id: 'acc_third',
        name: 'Third Account',
        balance: 0,
        created_at: '2026-10-30T03:00:00.000Z',
      });

      const response = await request(app).get('/api/v1/accounts?page=1&pageSize=2');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      // Latest first
      expect(response.body.data[0].id).toBe('acc_third');
      expect(response.body.data[1].id).toBe('acc_second');
      expect(response.body.meta).toMatchObject({
        currentPage: 1,
        pageSize: 2,
        totalRecords: 3,
        totalPages: 2,
      });
    });
  });
});
