import { z } from 'zod'

// Base schemas
export const uuidSchema = z.string().uuid('Invalid UUID format')
export const emailSchema = z.string().email('Invalid email address')
export const urlSchema = z.string().url('Invalid URL format')

// Pagination schema
export const paginationSchema = z.object({
  page: z.number().min(1, 'Page must be at least 1').default(1),
  limit: z.number().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),
})

// Invoice schemas
export const createInvoiceSchema = z.object({
  amount: z.string()
    .regex(/^\d+(\.\d{1,18})?$/, 'Invalid amount format')
    .refine((val) => parseFloat(val) > 0, 'Amount must be greater than 0'),
  currency: z.string()
    .min(3, 'Currency code must be at least 3 characters')
    .max(20, 'Currency code cannot exceed 20 characters')
    .toUpperCase(),
  description: z.string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional(),
  expiresIn: z.number()
    .min(300, 'Expiration must be at least 5 minutes (300 seconds)')
    .max(604800, 'Expiration cannot exceed 7 days (604800 seconds)')
    .default(3600), // 1 hour default
  callbackUrl: z.string().url('Invalid callback URL').optional(),
  metadata: z.record(z.string()).optional(),
})

export const invoiceStatusSchema = z.enum(['PENDING', 'PAID', 'EXPIRED', 'CANCELLED'])

export const getInvoicesSchema = z.object({
  ...paginationSchema.shape,
  status: invoiceStatusSchema.optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
  currency: z.string().optional(),
})

export const invoiceIdSchema = z.object({
  invoiceId: uuidSchema,
})

// Transaction schemas
export const transactionStatusSchema = z.enum(['PENDING', 'CONFIRMED', 'FAILED'])

export const getTransactionsSchema = z.object({
  ...paginationSchema.shape,
  invoiceId: uuidSchema.optional(),
  status: transactionStatusSchema.optional(),
  startDate: z.string().datetime('Invalid start date format').optional(),
  endDate: z.string().datetime('Invalid end date format').optional(),
})

// Webhook schemas
export const webhookConfigSchema = z.object({
  url: urlSchema,
  events: z.array(z.enum(['invoice.paid', 'invoice.expired', 'transaction.confirmed']))
    .min(1, 'At least one event must be selected'),
  secret: z.string().min(32, 'Webhook secret must be at least 32 characters').optional(),
})

export const testWebhookSchema = z.object({
  url: urlSchema,
  event: z.enum(['invoice.paid', 'invoice.expired', 'transaction.confirmed']),
})

// Merchant schemas
export const merchantProfileUpdateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  webhookUrl: urlSchema.optional().nullable(),
})

// Wallet schemas
export const walletBalanceSchema = z.object({
  currency: z.string().optional(),
})

// API response schemas
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.any()).optional(),
  }),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
})

export const successResponseSchema = z.object({
  data: z.any(),
  timestamp: z.string().datetime(),
  requestId: z.string().uuid(),
})

// Type exports for TypeScript
export type CreateInvoiceInput = z.infer<typeof createInvoiceSchema>
export type GetInvoicesInput = z.infer<typeof getInvoicesSchema>
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>
export type TransactionStatus = z.infer<typeof transactionStatusSchema>
export type GetTransactionsInput = z.infer<typeof getTransactionsSchema>
export type WebhookConfigInput = z.infer<typeof webhookConfigSchema>
export type TestWebhookInput = z.infer<typeof testWebhookSchema>
export type MerchantProfileUpdateInput = z.infer<typeof merchantProfileUpdateSchema>
export type ErrorResponse = z.infer<typeof errorResponseSchema>
export type SuccessResponse = z.infer<typeof successResponseSchema>