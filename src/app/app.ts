import express, { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import { errorHandler } from '../middleware/error-handler.middleware.js';
import { notFoundHandler } from '../middleware/not-found.middleware.js';
import { correlationIdMiddleware } from '../middleware/correlation-id.middleware.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const openApiPath = path.resolve(__dirname, '../docs/openapi.json');

export const createApp = (dependencies: AppDependencies = {}): Express => {
  const app = express();

  // Cross-cutting Middlewares
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json());
  app.use(correlationIdMiddleware);

  if (config.nodeEnv !== 'test') {
    app.use(morgan('combined'));
  }

  // Health check endpoint
  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'ok', uptime: process.uptime() });
  });

  // Interactive Swagger UI & OpenAPI Specification
  app.get('/api-docs.json', (_req, res) => {
    if (fs.existsSync(openApiPath)) {
      res.setHeader('Content-Type', 'application/json');
      res.sendFile(openApiPath);
    } else {
      res.status(404).json({ error: 'OpenAPI specification not found' });
    }
  });

  app.get('/docs', (_req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Transaction Ledger Service API Documentation</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = function() {
      SwaggerUIBundle({
        url: '/api-docs.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [SwaggerUIBundle.presets.apis],
        layout: "BaseLayout"
      });
    };
  </script>
</body>
</html>`);
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

