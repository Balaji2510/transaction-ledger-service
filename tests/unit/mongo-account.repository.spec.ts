import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model } from 'mongoose';
import { MongoAccountRepository } from '../../src/modules/accounts/repositories/mongo-account.repository.js';
import { AccountDocument } from '../../src/modules/accounts/models/account.mongoose.model.js';
import { ConflictError } from '../../src/common/errors/index.js';

describe('MongoAccountRepository Unit Tests', () => {
  let mockModel: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
    findOneAndUpdate: ReturnType<typeof vi.fn>;
    findByIdAndUpdate: ReturnType<typeof vi.fn>;
  };
  let repository: MongoAccountRepository;

  beforeEach(() => {
    mockModel = {
      create: vi.fn(),
      findById: vi.fn(),
      find: vi.fn(),
      exists: vi.fn(),
      deleteMany: vi.fn(),
      findOneAndUpdate: vi.fn(),
      findByIdAndUpdate: vi.fn(),
    };
    repository = new MongoAccountRepository(mockModel as unknown as Model<AccountDocument>);
  });

  describe('create', () => {
    it('should create an account document and map _id to id', async () => {
      const accountInput = {
        id: 'acc_123',
        name: 'Alice',
        balance: 0,
        created_at: '2026-10-30T09:00:00.000Z',
      };

      mockModel.create.mockResolvedValueOnce({
        toObject: () => ({
          _id: 'acc_123',
          name: 'Alice',
          balance: 0,
          created_at: '2026-10-30T09:00:00.000Z',
        }),
      });

      const result = await repository.create(accountInput);

      expect(mockModel.create).toHaveBeenCalledWith({
        _id: 'acc_123',
        name: 'Alice',
        balance: 0,
        created_at: '2026-10-30T09:00:00.000Z',
      });
      expect(result).toEqual({
        id: 'acc_123',
        name: 'Alice',
        balance: 0,
        created_at: '2026-10-30T09:00:00.000Z',
      });
    });

    it('should translate Mongo duplicate key error (code 11000) to ConflictError', async () => {
      const accountInput = {
        id: 'acc_duplicate',
        name: 'Bob',
        balance: 0,
        created_at: '2026-10-30T09:00:00.000Z',
      };

      const mongoDuplicateError = new Error('E11000 duplicate key error') as Error & { code: number };
      mongoDuplicateError.code = 11000;
      mockModel.create.mockRejectedValueOnce(mongoDuplicateError);

      await expect(repository.create(accountInput)).rejects.toThrow(ConflictError);
    });

    it('should rethrow unexpected errors directly', async () => {
      const accountInput = {
        id: 'acc_error',
        name: 'Charlie',
        balance: 0,
        created_at: '2026-10-30T09:00:00.000Z',
      };

      mockModel.create.mockRejectedValueOnce(new Error('Network disconnected'));

      await expect(repository.create(accountInput)).rejects.toThrow('Network disconnected');
    });
  });

  describe('findById', () => {
    it('should return mapped account when document is found', async () => {
      const execMock = vi.fn().mockResolvedValueOnce({
        _id: 'acc_123',
        name: 'Alice',
        balance: 0,
        created_at: '2026-10-30T09:00:00.000Z',
      });

      const leanMock = vi.fn().mockReturnValue({ exec: execMock });
      const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
      mockModel.findById.mockReturnValue({ select: selectMock });

      const result = await repository.findById('acc_123');

      expect(mockModel.findById).toHaveBeenCalledWith('acc_123');
      expect(result).toEqual({
        id: 'acc_123',
        name: 'Alice',
        balance: 0,
        created_at: '2026-10-30T09:00:00.000Z',
      });
    });

    it('should return null when document is not found', async () => {
      const execMock = vi.fn().mockResolvedValueOnce(null);
      const leanMock = vi.fn().mockReturnValue({ exec: execMock });
      const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
      mockModel.findById.mockReturnValue({ select: selectMock });

      const result = await repository.findById('non_existent');
      expect(result).toBeNull();
    });
  });

  describe('findBalanceById', () => {
    it('should return lean balance projection mapped to domain DTO when document is found', async () => {
      const execMock = vi.fn().mockResolvedValueOnce({
        _id: 'acc_123',
        balance: 150.75,
      });

      const leanMock = vi.fn().mockReturnValue({ exec: execMock });
      const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
      mockModel.findById.mockReturnValue({ select: selectMock });

      const result = await repository.findBalanceById('acc_123');

      expect(mockModel.findById).toHaveBeenCalledWith('acc_123');
      expect(selectMock).toHaveBeenCalledWith({ _id: 1, balance: 1 });
      expect(result).toEqual({
        accountId: 'acc_123',
        id: 'acc_123',
        balance: 150.75,
      });
    });

    it('should return null when document is not found', async () => {
      const execMock = vi.fn().mockResolvedValueOnce(null);
      const leanMock = vi.fn().mockReturnValue({ exec: execMock });
      const selectMock = vi.fn().mockReturnValue({ lean: leanMock });
      mockModel.findById.mockReturnValue({ select: selectMock });

      const result = await repository.findBalanceById('non_existent');
      expect(result).toBeNull();
    });
  });

  describe('findAll', () => {
    it('should return all mapped accounts sorted chronologically', async () => {
      const execMock = vi.fn().mockResolvedValueOnce([
        {
          _id: 'acc_2',
          name: 'Bob',
          balance: 0,
          created_at: '2026-10-30T10:00:00.000Z',
        },
        {
          _id: 'acc_1',
          name: 'Alice',
          balance: 0,
          created_at: '2026-10-30T09:00:00.000Z',
        },
      ]);

      const leanMock = vi.fn().mockReturnValue({ exec: execMock });
      const sortMock = vi.fn().mockReturnValue({ lean: leanMock });
      const selectMock = vi.fn().mockReturnValue({ sort: sortMock });
      mockModel.find.mockReturnValue({ select: selectMock });

      const results = await repository.findAll();

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('acc_2');
      expect(results[1].id).toBe('acc_1');
    });
  });

  describe('adjustBalance', () => {
    it('should credit balance with $inc and return updated domain entity', async () => {
      const execMock = vi.fn().mockResolvedValueOnce({
        _id: 'acc_credit',
        name: 'Credited User',
        balance: 300,
        created_at: '2026-10-30T09:00:00.000Z',
      });
      const leanMock = vi.fn().mockReturnValue({ exec: execMock });
      mockModel.findOneAndUpdate.mockReturnValue({ lean: leanMock });

      const result = await repository.adjustBalance('acc_credit', 100);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'acc_credit' },
        { $inc: { balance: 100 } },
        { new: true }
      );
      expect(result.balance).toBe(300);
    });

    it('should debit balance with $inc and balance condition when sufficient', async () => {
      const execMock = vi.fn().mockResolvedValueOnce({
        _id: 'acc_debit',
        name: 'Debited User',
        balance: 200,
        created_at: '2026-10-30T09:00:00.000Z',
      });
      const leanMock = vi.fn().mockReturnValue({ exec: execMock });
      mockModel.findOneAndUpdate.mockReturnValue({ lean: leanMock });

      const result = await repository.adjustBalance('acc_debit', -50);

      expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
        { _id: 'acc_debit', balance: { $gte: 50 } },
        { $inc: { balance: -50 } },
        { new: true }
      );
      expect(result.balance).toBe(200);
    });
  });

  describe('existsById', () => {
    it('should return true when document exists', async () => {
      mockModel.exists.mockResolvedValueOnce({ _id: 'acc_123' });
      const exists = await repository.existsById('acc_123');
      expect(exists).toBe(true);
    });

    it('should return false when document does not exist', async () => {
      mockModel.exists.mockResolvedValueOnce(null);
      const exists = await repository.existsById('acc_404');
      expect(exists).toBe(false);
    });
  });
});

