import { v4 as uuidv4 } from 'uuid';
import {
  Transaction,
  CreateTransactionDTO,
  GetTransactionsQuery,
  TransactionType,
  TransferDTO,
  TransferResult,
} from '../models/transaction.entity.js';
import { ITransactionRepository } from '../repositories/transaction.repository.interface.js';
import { IAccountRepository } from '../../accounts/repositories/account.repository.interface.js';
import {
  BadRequestError,
  DuplicateTransactionError,
  InsufficientBalanceError,
  NotFoundError,
} from '../../../common/errors/index.js';
import { createPaginationMeta, PaginationMeta } from '../../../common/http/pagination.js';

export interface TransactionHistoryResult {
  transactions: Transaction[];
  pagination: PaginationMeta;
}

export class TransactionService {
  constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly accountRepository: IAccountRepository
  ) {}

  /**
   * Fetches paginated transaction history for a given account.
   * Supports optional filtering by transaction type (credit, debit).
   * Ensures account exists before querying transactions.
   * Results are sorted in latest-first order based on created date.
   */
  async getTransactionHistory(
    accountId: string,
    query: GetTransactionsQuery = {}
  ): Promise<TransactionHistoryResult> {
    const trimmedId = accountId?.trim();
    if (!trimmedId) {
      throw new BadRequestError('Account ID is required and cannot be empty');
    }

    // Verify account exists
    const accountExists = await this.accountRepository.existsById(trimmedId);
    if (!accountExists) {
      throw new NotFoundError(`Account with id '${trimmedId}' not found`);
    }

    let filterType: TransactionType | undefined = undefined;
    if (query.type) {
      const normalized = query.type.toLowerCase().trim();
      if (normalized !== 'credit' && normalized !== 'debit') {
        throw new BadRequestError(
          "Invalid transaction type. Allowed values are 'credit' or 'debit'."
        );
      }
      filterType = normalized as TransactionType;
    }

    const page = Math.max(1, query.page || 1);
    const pageSize = Math.max(1, query.pageSize || query.limit || 10);

    const { transactions, total } = await this.transactionRepository.findByAccountId(
      trimmedId,
      {
        type: filterType,
        referenceId: query.referenceId?.trim(),
        page,
        pageSize,
      }
    );

    const pagination = createPaginationMeta(page, pageSize, total);

    return {
      transactions,
      pagination,
    };
  }

  /**
   * Records a new transaction (credit or debit) atomically.
   * Enforces business rules:
   * - Account ID must exist.
   * - Transaction type must be credit or debit.
   * - Amount must be > 0.
   * - Reference ID must be provided and unique for this account.
   * - Debit transaction must have sufficient balance.
   * - Creating the transaction and updating account balance is treated as an atomic operation.
   *   If either fails, neither change is persisted.
   */
  async recordTransaction(dto: CreateTransactionDTO): Promise<Transaction> {
    const trimmedAccountId = dto.accountId?.trim();
    if (!trimmedAccountId) {
      throw new BadRequestError('Account ID is required and cannot be empty');
    }

    const account = await this.accountRepository.findById(trimmedAccountId);
    if (!account) {
      throw new NotFoundError(`Account with id '${trimmedAccountId}' not found`);
    }

    const normalizedType = dto.type?.toLowerCase().trim() as TransactionType;
    if (normalizedType !== 'credit' && normalizedType !== 'debit') {
      throw new BadRequestError(
        "Invalid transaction type. Allowed values are 'credit' or 'debit'."
      );
    }

    if (typeof dto.amount !== 'number' || isNaN(dto.amount) || dto.amount <= 0) {
      throw new BadRequestError('Amount must be a positive number greater than 0');
    }

    const trimmedReferenceId = dto.referenceId?.trim();
    if (!trimmedReferenceId) {
      throw new BadRequestError('referenceId is required and cannot be empty');
    }

    // Check duplicate reference ID
    const isDuplicate = await this.transactionRepository.existsByReferenceId(
      trimmedAccountId,
      trimmedReferenceId
    );
    if (isDuplicate) {
      throw new DuplicateTransactionError(
        `Transaction with referenceId '${trimmedReferenceId}' already exists for account '${trimmedAccountId}'`
      );
    }

    // Pre-check sufficient balance for debit transactions
    if (normalizedType === 'debit' && account.balance < dto.amount) {
      throw new InsufficientBalanceError(
        `Insufficient balance in account '${trimmedAccountId}'. Current balance is ${account.balance}, requested debit is ${dto.amount}.`
      );
    }

    const delta = normalizedType === 'credit' ? dto.amount : -dto.amount;

    // Execute balance adjustment atomically
    await this.accountRepository.adjustBalance(trimmedAccountId, delta);

    const transaction: Transaction = {
      id: dto.id?.trim() || uuidv4(),
      accountId: trimmedAccountId,
      type: normalizedType,
      amount: dto.amount,
      referenceId: trimmedReferenceId,
      description: dto.description?.trim() || '',
      created_at: new Date().toISOString(),
    };

    try {
      const createdTx = await this.transactionRepository.create(transaction);
      return createdTx;
    } catch (error) {
      // Rollback account balance update if transaction creation failed
      await this.accountRepository.adjustBalance(trimmedAccountId, -delta);
      throw error;
    }
  }

  /**
   * Transfers money atomically from one account to another account.
   * Requirements:
   * - Both accounts must exist.
   * - Source and destination accounts cannot be identical.
   * - Source account must have sufficient balance.
   * - The debit and credit must happen atomically.
   * - If any part fails, the entire transfer is rolled back.
   * - A partial transfer is never possible.
   */
  async transfer(dto: TransferDTO): Promise<TransferResult> {
    const fromId = dto.fromAccountId?.trim();
    const toId = dto.toAccountId?.trim();
    const referenceId = dto.referenceId?.trim();

    if (!fromId) {
      throw new BadRequestError('fromAccountId is required');
    }
    if (!toId) {
      throw new BadRequestError('toAccountId is required');
    }
    if (fromId === toId) {
      throw new BadRequestError(
        'Cannot transfer money to the same account. fromAccountId and toAccountId must be different.'
      );
    }
    if (typeof dto.amount !== 'number' || isNaN(dto.amount) || dto.amount <= 0) {
      throw new BadRequestError('Transfer amount must be a positive number greater than 0');
    }
    if (!referenceId) {
      throw new BadRequestError('referenceId is required and cannot be empty');
    }

    // Verify both accounts exist
    const fromAccount = await this.accountRepository.findById(fromId);
    if (!fromAccount) {
      throw new NotFoundError(`Source account with id '${fromId}' not found`);
    }

    const toAccount = await this.accountRepository.findById(toId);
    if (!toAccount) {
      throw new NotFoundError(`Destination account with id '${toId}' not found`);
    }

    // Verify source account has sufficient balance
    if (fromAccount.balance < dto.amount) {
      throw new InsufficientBalanceError(
        `Insufficient balance in source account '${fromId}'. Current balance is ${fromAccount.balance}, requested transfer amount is ${dto.amount}.`
      );
    }

    // Check duplicate reference ID on source account
    const isDuplicate = await this.transactionRepository.existsByReferenceId(fromId, referenceId);
    if (isDuplicate) {
      throw new DuplicateTransactionError(
        `Transfer with referenceId '${referenceId}' already exists for account '${fromId}'`
      );
    }

    const transferId = uuidv4();
    const now = new Date().toISOString();

    // Step 1: Debit from source account
    const updatedFrom = await this.accountRepository.adjustBalance(fromId, -dto.amount);

    // Step 2: Credit to destination account
    let updatedTo;
    try {
      updatedTo = await this.accountRepository.adjustBalance(toId, dto.amount);
    } catch (error) {
      // Rollback step 1
      await this.accountRepository.adjustBalance(fromId, dto.amount);
      throw error;
    }

    // Step 3: Record debit transaction for source account
    let debitTx: Transaction;
    try {
      debitTx = await this.transactionRepository.create({
        id: uuidv4(),
        accountId: fromId,
        type: 'debit',
        amount: dto.amount,
        referenceId,
        description: dto.description?.trim() || `Transfer to account ${toId}`,
        created_at: now,
      });
    } catch (error) {
      // Rollback step 1 and step 2
      await this.accountRepository.adjustBalance(fromId, dto.amount);
      await this.accountRepository.adjustBalance(toId, -dto.amount);
      throw error;
    }

    // Step 4: Record credit transaction for destination account
    let creditTx: Transaction;
    try {
      creditTx = await this.transactionRepository.create({
        id: uuidv4(),
        accountId: toId,
        type: 'credit',
        amount: dto.amount,
        referenceId: `${referenceId}_cred`,
        description: dto.description?.trim() || `Transfer from account ${fromId}`,
        created_at: now,
      });
    } catch (error) {
      // Rollback step 1, 2, and delete debit transaction
      await this.transactionRepository.deleteById(debitTx.id);
      await this.accountRepository.adjustBalance(fromId, dto.amount);
      await this.accountRepository.adjustBalance(toId, -dto.amount);
      throw error;
    }

    return {
      transferId,
      referenceId,
      fromAccountId: fromId,
      toAccountId: toId,
      amount: dto.amount,
      fromAccountBalance: updatedFrom.balance,
      toAccountBalance: updatedTo.balance,
      debitTransactionId: debitTx.id,
      creditTransactionId: creditTx.id,
      created_at: now,
    };
  }
}
