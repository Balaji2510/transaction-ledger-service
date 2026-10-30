import { Router } from 'express';
import { TransactionController } from '../controllers/transaction.controller.js';
import { validateRequest } from '../../../middleware/validate-request.middleware.js';
import {
  getTransactionsParamsSchema,
  getTransactionsQuerySchema,
} from '../validators/get-transactions.validator.js';
import { createTransactionBodySchema } from '../validators/create-transaction.validator.js';
import { transferBodySchema } from '../validators/transfer.validator.js';

export const createTransactionRouter = (
  transactionController: TransactionController
): Router => {
  const router = Router();

  // Transfer API
  router.post(
    '/transfer',
    validateRequest({ body: transferBodySchema }),
    transactionController.transferMoney
  );

  // Get transactions
  router.get(
    '/:id/transactions',
    validateRequest({
      params: getTransactionsParamsSchema,
      query: getTransactionsQuerySchema,
    }),
    transactionController.getTransactions
  );

  router.get(
    '/:accountId/transactions',
    validateRequest({
      query: getTransactionsQuerySchema,
    }),
    transactionController.getTransactions
  );

  // Post transaction
  router.post(
    '/:id/transactions',
    validateRequest({
      params: getTransactionsParamsSchema,
      body: createTransactionBodySchema,
    }),
    transactionController.createTransaction
  );

  // Explicitly enforce transaction immutability
  router.put('/:id/transactions', transactionController.immutableMethodNotAllowed);
  router.patch('/:id/transactions', transactionController.immutableMethodNotAllowed);
  router.delete('/:id/transactions', transactionController.immutableMethodNotAllowed);
  router.put('/:id/transactions/:txId', transactionController.immutableMethodNotAllowed);
  router.patch('/:id/transactions/:txId', transactionController.immutableMethodNotAllowed);
  router.delete('/:id/transactions/:txId', transactionController.immutableMethodNotAllowed);

  return router;
};
