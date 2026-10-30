import { createApp } from '../app/app.js';
import { config } from '../config/env.js';
import { databaseConnection } from '../infrastructure/database/mongoose.connection.js';
import { MongoAccountRepository } from '../modules/accounts/repositories/mongo-account.repository.js';
import { InMemoryAccountRepository } from '../modules/accounts/repositories/in-memory-account.repository.js';
import { IAccountRepository } from '../modules/accounts/repositories/account.repository.interface.js';
import { MongoTransactionRepository } from '../modules/transactions/repositories/mongo-transaction.repository.js';
import { InMemoryTransactionRepository } from '../modules/transactions/repositories/in-memory-transaction.repository.js';
import { ITransactionRepository } from '../modules/transactions/repositories/transaction.repository.interface.js';

let accountRepository: IAccountRepository;
let transactionRepository: ITransactionRepository;

const bootstrap = async () => {
  const useInMemory = process.env.USE_IN_MEMORY === 'true';

  if (!useInMemory) {
    try {
      await databaseConnection.connect(config.mongodbUri);
      accountRepository = new MongoAccountRepository();
      transactionRepository = new MongoTransactionRepository();
      console.log('Using Mongo repositories with MongoDB persistence');
    } catch {
      console.warn('⚠️ MongoDB connection could not be established. Falling back to InMemory repositories.');
      accountRepository = new InMemoryAccountRepository();
      transactionRepository = new InMemoryTransactionRepository();
    }
  } else {
    accountRepository = new InMemoryAccountRepository();
    transactionRepository = new InMemoryTransactionRepository();
    console.log('Using InMemory repositories as configured via USE_IN_MEMORY=true');
  }

  const app = createApp({ accountRepository, transactionRepository });

  const server = app.listen(config.port, () => {
    console.log(`🚀 Transaction Ledger Service running in ${config.nodeEnv} mode`);
    console.log(`📡 Listening on http://localhost:${config.port}${config.apiPrefix}`);
    console.log(`🩺 Health check at http://localhost:${config.port}/health`);
  });

  const gracefulShutdown = async (signal: string) => {
    console.log(`Received ${signal}. Shutting down gracefully...`);
    server.close(async () => {
      console.log('HTTP server closed.');
      if (databaseConnection.getStatus()) {
        await databaseConnection.disconnect();
      }
      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forcefully terminating process after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  return { app, server };
};

bootstrap().catch((err) => {
  console.error('Fatal error during application startup:', err);
  process.exit(1);
});
