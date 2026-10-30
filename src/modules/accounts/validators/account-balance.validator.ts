import { z } from 'zod';

export const getAccountBalanceParamsSchema = z.object({
  id: z
    .string({ error: 'Account ID must be a string' })
    .trim()
    .min(1, 'Account ID is required and cannot be empty'),
});

export type GetAccountBalanceParams = z.infer<typeof getAccountBalanceParamsSchema>;
