import { z } from 'zod';

export const createTransactionBodySchema = z.object({
  id: z.string().trim().min(1).optional(),
  type: z
    .string({ error: 'Transaction type is required' })
    .trim()
    .transform((val) => val.toLowerCase())
    .refine((val) => val === 'credit' || val === 'debit', {
      message: "Invalid transaction type. Allowed values are 'credit' or 'debit'.",
    }),
  amount: z
    .number({ error: 'Amount is required and must be a number' })
    .positive('Amount must be greater than 0'),
  referenceId: z
    .string({ error: 'referenceId is required' })
    .trim()
    .min(1, 'referenceId is required and cannot be empty'),
  description: z.string().trim().optional(),
});

export type CreateTransactionInput = z.infer<typeof createTransactionBodySchema>;

