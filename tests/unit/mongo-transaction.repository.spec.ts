import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Model } from 'mongoose';
import { MongoTransactionRepository } from '../../src/modules/transactions/repositories/mongo-transaction.repository.js';
import { TransactionDocument } from '../../src/modules/transactions/models/transaction.mongoose.model.js';
import { DuplicateTransactionError } from '../../src/common/errors/index.js';

describe('MongoTransactionRepository Unit Tests', () => {
  let mockModel: {
    create: ReturnType<typeof vi.fn>;
    find: ReturnType<typeof vi.fn>;
    countDocuments: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    findByIdAndDelete: ReturnType<typeof vi.fn>;
    deleteMany: ReturnType<typeof vi.fn>;
  };
  let repository: MongoTransactionRepository;

  beforeEach(() => {
    mockModel = {
      create: vi.fn(),
      find: vi.fn(),
      countDocuments: vi.fn(),
      exists: vi.fn(),
      findByIdAndDelete: vi.fn(),
      deleteMany: vi.fn(),
    };
    repository = new MongoTransactionRepository(mockModel as unknown as Model<TransactionDocument>);
  });

  describe('create', () => {
    it('should create a transaction document and map _id to id', async () => {
      const input = {
        id: 'tx_123',
        accountId: 'acc_abc',
        type: 'credit' as const,
        amount: 250,
        referenceId: 'ref_123',
        description: 'Deposit',
        created_at: '2026-10-30T10:00:00.000Z',
      };

      mockModel.create.mockResolvedValueOnce({
        toObject: () => ({
          _id: 'tx_123',
          accountId: 'acc_abc',
          type: 'credit',
          amount: 250,
          referenceId: 'ref_123',
          description: 'Deposit',
          created_at: '2026-10-30T10:00:00.000Z',
        }),
      });

      const result = await repository.create(input);

      expect(mockModel.create).toHaveBeenCalledWith({
        _id: 'tx_123',
        accountId: 'acc_abc',
        type: 'credit',
        amount: 250,
        referenceId: 'ref_123',
        description: 'Deposit',
        created_at: '2026-10-30T10:00:00.000Z',
      });
      expect(result).toEqual({
        id: 'tx_123',
        accountId: 'acc_abc',
        type: 'credit',
        amount: 250,
        referenceId: 'ref_123',
        description: 'Deposit',
        created_at: '2026-10-30T10:00:00.000Z',
      });
    });

    it('should throw DuplicateTransactionError when Mongo reports code 11000 duplicate key', async () => {
      const mongoDupError = new Error('E11000 duplicate key error') as Error & { code: number };
      mongoDupError.code = 11000;
      mockModel.create.mockRejectedValueOnce(mongoDupError);

      await expect(
        repository.create({
          id: 'tx_dup',
          accountId: 'acc_1',
          type: 'credit',
          amount: 50,
          referenceId: 'ref_dup',
          created_at: '2026-10-30T10:00:00.000Z',
        })
      ).rejects.toThrow(DuplicateTransactionError);
    });
  });

  describe('findByAccountId', () => {
    it('should query by accountId with lean projection, sort latest first, and paginate', async () => {
      const execCountMock = vi.fn().mockResolvedValueOnce(1);
      mockModel.countDocuments.mockReturnValue({ exec: execCountMock });

      const execFindMock = vi.fn().mockResolvedValueOnce([
        {
          _id: 'tx_1',
          accountId: 'acc_abc',
          type: 'debit',
          amount: 50,
          referenceId: 'ref_coffee',
          description: 'Coffee',
          created_at: '2026-10-30T10:00:00.000Z',
        },
      ]);

      const leanMock = vi.fn().mockReturnValue({ exec: execFindMock });
      const limitMock = vi.fn().mockReturnValue({ lean: leanMock });
      const skipMock = vi.fn().mockReturnValue({ limit: limitMock });
      const sortMock = vi.fn().mockReturnValue({ skip: skipMock });
      const selectMock = vi.fn().mockReturnValue({ sort: sortMock });
      mockModel.find.mockReturnValue({ select: selectMock });

      const result = await repository.findByAccountId('acc_abc', { page: 2, pageSize: 5 });

      expect(mockModel.find).toHaveBeenCalledWith({ accountId: 'acc_abc' });
      expect(selectMock).toHaveBeenCalledWith({
        _id: 1,
        accountId: 1,
        type: 1,
        amount: 1,
        referenceId: 1,
        description: 1,
        created_at: 1,
      });
      expect(sortMock).toHaveBeenCalledWith({ created_at: -1 });
      expect(skipMock).toHaveBeenCalledWith(5); // (2 - 1) * 5
      expect(limitMock).toHaveBeenCalledWith(5);
      expect(result.total).toBe(1);
      expect(result.transactions[0].id).toBe('tx_1');
    });

    it('should include type in query filter when specified', async () => {
      const execCountMock = vi.fn().mockResolvedValueOnce(0);
      mockModel.countDocuments.mockReturnValue({ exec: execCountMock });

      const execFindMock = vi.fn().mockResolvedValueOnce([]);
      const leanMock = vi.fn().mockReturnValue({ exec: execFindMock });
      const limitMock = vi.fn().mockReturnValue({ lean: leanMock });
      const skipMock = vi.fn().mockReturnValue({ limit: limitMock });
      const sortMock = vi.fn().mockReturnValue({ skip: skipMock });
      const selectMock = vi.fn().mockReturnValue({ sort: sortMock });
      mockModel.find.mockReturnValue({ select: selectMock });

      await repository.findByAccountId('acc_abc', { type: 'credit' });

      expect(mockModel.find).toHaveBeenCalledWith({ accountId: 'acc_abc', type: 'credit' });
      expect(mockModel.countDocuments).toHaveBeenCalledWith({ accountId: 'acc_abc', type: 'credit' });
    });
  });

  describe('existsByReferenceId', () => {
    it('should return true when transaction with accountId and referenceId exists', async () => {
      mockModel.exists.mockResolvedValueOnce({ _id: 'tx_1' });
      const exists = await repository.existsByReferenceId('acc_1', 'ref_1');
      expect(exists).toBe(true);
      expect(mockModel.exists).toHaveBeenCalledWith({ accountId: 'acc_1', referenceId: 'ref_1' });
    });
  });
});
