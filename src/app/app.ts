import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import { config } from '../config/env.js';
import { errorHandler } from '../middleware/error-handler.middleware.js';
import { notFoundHandler } from '../middleware/not-found.middleware.js';
import { IAccountRepository } from '../modules/accounts/repositories/account.repository.interface.js';
import { InMemoryAccountRepository } from '../modules/accounts/repositories/in-memory-account.repository.js';
import { AccountService } from '../modules/accounts/services/account.service.js';
import { AccountController } from '../modules/accounts/controllers/account.controller.js';
import { createAccountRouter } from '../modules/accounts/routes/account.routes.js';
import { ITransactionRepository } from '../modules/transactions/repositories/transaction.repository.interface.js';
import { InMemoryTransactionRepository } from '../modules/transactions/repositories/in-memory-transaction.repository.js';
import { TransactionService } from '../modules/transactions/services/transaction.service.js';
import { TransactionController } from '../modules/transactions/controllers/transaction.controller.js';
import { createTransactionRouter } from '../modules/transactions/routes/transaction.routes.js';

export interface AppDependencies {
  accountRepository?: IAccountRepository;
  transactionRepository?: ITransactionRepository;
}

export const createApp = (dependencies: AppDependencies = {}): Express => {
  const app = express();

  // Cross-cutting Middlewares
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());

  if (config.nodeEnv !== 'test') {
    app.use(morgan('combined'));
  }

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  // Dependency Resolution
  const accountRepository = dependencies.accountRepository || new InMemoryAccountRepository();
  const transactionRepository =
    dependencies.transactionRepository || new InMemoryTransactionRepository();

  const accountService = new AccountService(accountRepository);
  const accountController = new AccountController(accountService);

  const transactionService = new TransactionService(transactionRepository, accountRepository);
  const transactionController = new TransactionController(transactionService);

  const accountRouter = createAccountRouter(accountController, transactionController);
  const transactionRouter = createTransactionRouter(transactionController);

  // Mount API Routes
  app.use(`${config.apiPrefix}/accounts`, accountRouter);
  app.use(`${config.apiPrefix}/transactions`, transactionRouter);

  // 404 & Centralized Error Handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

