import { describe, it, expect, beforeEach } from 'vitest';
import { AccountService } from '../../src/modules/accounts/services/account.service.js';
import { InMemoryAccountRepository } from '../../src/modules/accounts/repositories/in-memory-account.repository.js';
import { BadRequestError, ConflictError, NotFoundError } from '../../src/common/errors/index.js';

describe('AccountService Unit Tests', () => {
  let repository: InMemoryAccountRepository;
  let service: AccountService;

  beforeEach(() => {
    repository = new InMemoryAccountRepository();
    service = new AccountService(repository);
  });

  describe('createAccount', () => {
    it('should create an account with 0 initial balance and auto-generated system timestamp', async () => {
      const beforeTime = new Date().getTime();
      const account = await service.createAccount({ name: 'Alice Smith' });
      const afterTime = new Date().getTime();

      expect(account.id).toBeDefined();
      expect(typeof account.id).toBe('string');
      expect(account.id.length).toBeGreaterThan(0);
      expect(account.name).toBe('Alice Smith');
      expect(account.balance).toBe(0);

      expect(account.created_at).toBeDefined();
      const createdAtTime = new Date(account.created_at).getTime();
      expect(createdAtTime).toBeGreaterThanOrEqual(beforeTime);
      expect(createdAtTime).toBeLessThanOrEqual(afterTime);
    });

    it('should allow custom id if provided and unique', async () => {
      const customId = 'acc_custom_001';
      const account = await service.createAccount({ id: customId, name: 'Bob Jones' });

      expect(account.id).toBe(customId);
      expect(account.name).toBe('Bob Jones');
      expect(account.balance).toBe(0);
    });

    it('should throw ConflictError if an account with the specified id already exists', async () => {
      const customId = 'acc_duplicate';
      await service.createAccount({ id: customId, name: 'First Account' });

      await expect(
        service.createAccount({ id: customId, name: 'Second Account' })
      ).rejects.toThrow(ConflictError);
    });

    it('should trim whitespace from account name', async () => {
      const account = await service.createAccount({ name: '   Charlie Brown   ' });
      expect(account.name).toBe('Charlie Brown');
    });
  });

  describe('getAccountById', () => {
    it('should return account when found', async () => {
      const created = await service.createAccount({ name: 'David' });
      const found = await service.getAccountById(created.id);

      expect(found).toEqual(created);
    });

    it('should throw NotFoundError when account does not exist', async () => {
      await expect(service.getAccountById('non-existent-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getAccountBalance', () => {
    it('should return account balance with accountId, id, and balance when found', async () => {
      const created = await service.createAccount({ name: 'Eve', id: 'acc_eve_01' });
      const balanceData = await service.getAccountBalance(created.id);

      expect(balanceData).toEqual({
        accountId: 'acc_eve_01',
        id: 'acc_eve_01',
        balance: 0,
      });
    });

    it('should throw NotFoundError when account does not exist', async () => {
      await expect(service.getAccountBalance('non-existent-id')).rejects.toThrow(NotFoundError);
      await expect(service.getAccountBalance('non-existent-id')).rejects.toThrow(
        "Account with id 'non-existent-id' not found"
      );
    });

    it('should throw BadRequestError when account ID is empty or whitespace', async () => {
      await expect(service.getAccountBalance('')).rejects.toThrow(BadRequestError);
      await expect(service.getAccountBalance('   ')).rejects.toThrow(BadRequestError);
    });
  });

  describe('getAllAccounts', () => {
    it('should return all created accounts', async () => {
      await service.createAccount({ name: 'User 1' });
      await service.createAccount({ name: 'User 2' });

      const accounts = await service.getAllAccounts();
      expect(accounts).toHaveLength(2);
      expect(accounts.map(a => a.name)).toEqual(['User 1', 'User 2']);
    });
  });
});

