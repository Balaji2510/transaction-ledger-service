import { Request, Response, NextFunction } from 'express';
import { TransactionService } from '../services/transaction.service.js';
import { ApiResponseBuilder } from '../../../common/http/api-response.js';
import { TransactionType } from '../models/transaction.entity.js';
import { MethodNotAllowedError } from '../../../common/errors/index.js';

export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  getTransactions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id || req.params.accountId || (req.query.accountId as string);
      const accountId = Array.isArray(id) ? id[0] : id;

      const type = req.query.type as TransactionType | undefined;
      const page = req.query.page ? parseInt(req.query.page as string, 10) : undefined;
      const pageSize = req.query.pageSize
        ? parseInt(req.query.pageSize as string, 10)
        : req.query.limit
        ? parseInt(req.query.limit as string, 10)
        : undefined;

      const { transactions, pagination } = await this.transactionService.getTransactionHistory(
        accountId,
        {
          type,
          page,
          pageSize,
        }
      );

      res.status(200).json(ApiResponseBuilder.success(transactions, pagination));
    } catch (error) {
      next(error);
    }
  };

  createTransaction = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const id = req.params.id || req.params.accountId || req.body.accountId;
      const accountId = Array.isArray(id) ? id[0] : id;

      const { type, amount, referenceId, description, id: customId } = req.body;

      const transaction = await this.transactionService.recordTransaction({
        id: customId,
        accountId,
        type,
        amount,
        referenceId,
        description,
      });

      res.status(201).json(ApiResponseBuilder.success(transaction));
    } catch (error) {
      next(error);
    }
  };

  transferMoney = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { fromAccountId, toAccountId, amount, referenceId, description } = req.body;

      const result = await this.transactionService.transfer({
        fromAccountId,
        toAccountId,
        amount,
        referenceId,
        description,
      });

      res.status(200).json(ApiResponseBuilder.success(result));
    } catch (error) {
      next(error);
    }
  };

  immutableMethodNotAllowed = (_req: Request, _res: Response, next: NextFunction): void => {
    next(
      new MethodNotAllowedError(
        'Transactions are immutable. Modifying or deleting transactions is strictly prohibited.'
      )
    );
  };
}
