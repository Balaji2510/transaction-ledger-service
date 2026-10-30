import { z } from 'zod';

export const transferBodySchema = z
  .object({
    fromAccountId: z
      .string({ error: 'fromAccountId is required' })
      .trim()
      .min(1, 'fromAccountId cannot be empty'),
    toAccountId: z
      .string({ error: 'toAccountId is required' })
      .trim()
      .min(1, 'toAccountId cannot be empty'),
    amount: z
      .number({ error: 'Amount is required and must be a number' })
      .positive('Transfer amount must be greater than 0'),
    referenceId: z
      .string({ error: 'referenceId is required' })
      .trim()
      .min(1, 'referenceId is required and cannot be empty'),
    description: z.string().trim().optional(),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: 'Cannot transfer money to the same account. fromAccountId and toAccountId must be different.',
    path: ['toAccountId'],
  });

export type TransferInput = z.infer<typeof transferBodySchema>;
