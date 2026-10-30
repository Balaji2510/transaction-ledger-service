import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { createApp } from '../../src/app/app.js';
import { InMemoryAccountRepository } from '../../src/modules/accounts/repositories/in-memory-account.repository.js';

describe('GET /api/v1/accounts/:id/balance (Get Account Balance API Integration)', () => {
  let repository: InMemoryAccountRepository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    repository = new InMemoryAccountRepository();
    app = createApp({ accountRepository: repository });
  });

  describe('Success Cases', () => {
    it('should return 200 with accurate current balance and account ID for a valid account', async () => {
      // 1. Create an account
      const createRes = await request(app)
        .post('/api/v1/accounts')
        .send({
          id: 'acc_balance_101',
          name: 'Alice Springs',
        });

      expect(createRes.status).toBe(201);
      const accountId = createRes.body.data.id;

      // 2. Query balance
      const balanceRes = await request(app).get(`/api/v1/accounts/${accountId}/balance`);

      expect(balanceRes.status).toBe(200);
      expect(balanceRes.body.success).toBe(true);
      expect(balanceRes.body.data).toBeDefined();
      expect(balanceRes.body.data.accountId).toBe('acc_balance_101');
      expect(balanceRes.body.data.id).toBe('acc_balance_101');
      expect(balanceRes.body.data.balance).toBe(0);
      expect(balanceRes.body.meta).toBeDefined();
      expect(balanceRes.body.meta.timestamp).toBeDefined();
      expect(new Date(balanceRes.body.meta.timestamp).toISOString()).toBe(balanceRes.body.meta.timestamp);
    });

    it('should accurately return positive balance', async () => {
      // Directly seed an account with positive balance in repository
      await repository.create({
        id: 'acc_funded_999',
        name: 'Bob Funded',
        balance: 1250.50,
        created_at: new Date().toISOString(),
      });

      const response = await request(app).get('/api/v1/accounts/acc_funded_999/balance');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accountId).toBe('acc_funded_999');
      expect(response.body.data.balance).toBe(1250.50);
    });

    it('should support alternate route /api/v1/accounts/balance/:id', async () => {
      await repository.create({
        id: 'acc_route_test',
        name: 'Charlie Route',
        balance: 42,
        created_at: new Date().toISOString(),
      });

      const response = await request(app).get('/api/v1/accounts/balance/acc_route_test');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.accountId).toBe('acc_route_test');
      expect(response.body.data.balance).toBe(42);
    });
  });

  describe('Error Cases', () => {
    it('should return 404 with appropriate error message when account does not exist', async () => {
      const response = await request(app).get('/api/v1/accounts/non_existent_account_xyz/balance');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('NOT_FOUND');
      expect(response.body.error.message).toBe("Account with id 'non_existent_account_xyz' not found");
      expect(response.body.meta?.timestamp).toBeDefined();
    });

    it('should return 400 Bad Request when account ID param is only whitespace', async () => {
      const response = await request(app).get('/api/v1/accounts/%20%20%20/balance');

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('BAD_REQUEST');
      expect(response.body.error.message).toMatch(/Account ID is required and cannot be empty/i);
    });
  });
});
