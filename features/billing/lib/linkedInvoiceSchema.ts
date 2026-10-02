import { z } from 'zod'

export const linkedInvoiceSchema = z.object({
  client_id: z.string().optional(), // Validated manually when not preselected
  group_by: z.enum(['entry', 'phase', 'project', 'day', 'custom']),
  custom_description: z.string().trim().optional(),
  issue_date: z.string().min(1, 'Datum vystavení je povinné'),
  due_date: z.string().min(1, 'Datum splatnosti je povinné'),
  tax_rate: z.string().optional(),
  notes: z.string().optional()
}).refine(data => data.group_by !== 'custom' || (
  !!data.custom_description && [...data.custom_description].length <= 1000
), {
  path: ['custom_description'],
  message: 'Vlastní popis položky musí obsahovat 1 až 1000 znaků.'
})

export type LinkedInvoiceFormData = z.infer<typeof linkedInvoiceSchema>
