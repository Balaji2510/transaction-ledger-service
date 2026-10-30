import { Request, Response, NextFunction } from 'express';
import { AccountService } from '../services/account.service.js';
import { ApiResponseBuilder } from '../../../common/http/api-response.js';
import { createPaginationMeta } from '../../../common/http/pagination.js';

export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  createAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, id } = req.body;
      const account = await this.accountService.createAccount({ name, id });
      res.status(201).json(ApiResponseBuilder.success(account));
    } catch (error) {
      next(error);
    }
  };

  getAccountById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const accountId = Array.isArray(id) ? id[0] : id;
      const account = await this.accountService.getAccountById(accountId);
      res.status(200).json(ApiResponseBuilder.success(account));
    } catch (error) {
      next(error);
    }
  };

  getAccountBalance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const accountId = Array.isArray(id) ? id[0] : id;
      const balance = await this.accountService.getAccountBalance(accountId);
      res.status(200).json(ApiResponseBuilder.success(balance));
    } catch (error) {
      next(error);
    }
  };

  getAllAccounts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = req.query.page ? Math.max(1, parseInt(req.query.page as string, 10) || 1) : 1;
      const pageSize = req.query.pageSize
        ? Math.max(1, parseInt(req.query.pageSize as string, 10) || 10)
        : req.query.limit
        ? Math.max(1, parseInt(req.query.limit as string, 10) || 10)
        : 10;

      const accounts = await this.accountService.getAllAccounts();
      // Sort latest first based on created date
      accounts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      const total = accounts.length;
      const startIndex = (page - 1) * pageSize;
      const paginated = accounts.slice(startIndex, startIndex + pageSize);

      const pagination = createPaginationMeta(page, pageSize, total);
      res.status(200).json(ApiResponseBuilder.success(paginated, pagination));
    } catch (error) {
      next(error);
    }
  };
}
