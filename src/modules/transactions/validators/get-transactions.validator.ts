import { z } from 'zod';

export const getTransactionsParamsSchema = z.object({
  id: z
    .string({ error: 'Account ID must be a string' })
    .trim()
    .min(1, 'Account ID is required and cannot be empty'),
});

export const getTransactionsQuerySchema = z.object({
  type: z
    .string()
    .trim()
    .transform((val) => val.toLowerCase())
    .refine((val) => val === '' || val === 'credit' || val === 'debit', {
      message: "Invalid transaction type. Allowed values are 'credit' or 'debit'.",
    })
    .optional(),
  page: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return 1;
      const parsed = typeof val === 'number' ? val : parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 1 : parsed;
    }),
  pageSize: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const parsed = typeof val === 'number' ? val : parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 10 : Math.min(100, parsed);
    }),
  limit: z
    .union([z.string(), z.number()])
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      const parsed = typeof val === 'number' ? val : parseInt(val, 10);
      return isNaN(parsed) || parsed < 1 ? 10 : Math.min(100, parsed);
    }),
});

export type GetTransactionsParamsInput = z.infer<typeof getTransactionsParamsSchema>;
export type GetTransactionsQueryInput = z.infer<typeof getTransactionsQuerySchema>;
