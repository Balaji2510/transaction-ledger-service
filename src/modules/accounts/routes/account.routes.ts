import { Router } from 'express';
import { AccountController } from '../controllers/account.controller.js';
import { TransactionController } from '../../transactions/controllers/transaction.controller.js';
import { validateRequest } from '../../../middleware/validate-request.middleware.js';
import { createAccountBodySchema } from '../validators/create-account.validator.js';
import { getAccountBalanceParamsSchema } from '../validators/account-balance.validator.js';
import {
  getTransactionsParamsSchema,
  getTransactionsQuerySchema,
} from '../../transactions/validators/get-transactions.validator.js';
import { createTransactionBodySchema } from '../../transactions/validators/create-transaction.validator.js';
import { transferBodySchema } from '../../transactions/validators/transfer.validator.js';

export const createAccountRouter = (
  accountController: AccountController,
  transactionController?: TransactionController
): Router => {
  const router = Router();

  router.post(
    '/',
    validateRequest({ body: createAccountBodySchema }),
    accountController.createAccount
  );

  if (transactionController) {
    router.post(
      '/transfer',
      validateRequest({ body: transferBodySchema }),
      transactionController.transferMoney
    );
  }

  router.get(
    '/:id/balance',
    validateRequest({ params: getAccountBalanceParamsSchema }),
    accountController.getAccountBalance
  );

  router.get(
    '/balance/:id',
    validateRequest({ params: getAccountBalanceParamsSchema }),
    accountController.getAccountBalance
  );

  if (transactionController) {
    router.get(
      '/:id/transactions',
      validateRequest({
        params: getTransactionsParamsSchema,
        query: getTransactionsQuerySchema,
      }),
      transactionController.getTransactions
    );

    router.post(
      '/:id/transactions',
      validateRequest({
        params: getTransactionsParamsSchema,
        body: createTransactionBodySchema,
      }),
      transactionController.createTransaction
    );

    // Enforce transaction immutability
    router.put('/:id/transactions', transactionController.immutableMethodNotAllowed);
    router.patch('/:id/transactions', transactionController.immutableMethodNotAllowed);
    router.delete('/:id/transactions', transactionController.immutableMethodNotAllowed);
    router.put('/:id/transactions/:txId', transactionController.immutableMethodNotAllowed);
    router.patch('/:id/transactions/:txId', transactionController.immutableMethodNotAllowed);
    router.delete('/:id/transactions/:txId', transactionController.immutableMethodNotAllowed);
  }

  router.get('/:id', accountController.getAccountById);
  router.get('/', accountController.getAllAccounts);

  return router;
};


