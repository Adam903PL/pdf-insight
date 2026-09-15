import { z } from 'zod'

/*
 * Analysis result schema — the contract between Gemini output, the API and the UI.
 * Intentionally duplicated (no shared package): web/src/lib/schema.ts and
 * server/src/schema.ts must stay identical. The server copy additionally
 * defines the request schema below this block.
 */

export const DOCUMENT_TYPES = ['faktura', 'umowa', 'oferta', 'raport', 'inne'] as const

/** Calendar date in ISO 8601 format: YYYY-MM-DD. */
const IsoDateSchema = z.iso.date()

export const DocumentTypeSchema = z.enum(DOCUMENT_TYPES)

export const DocumentInfoSchema = z.object({
  fileName: z.string().min(1),
  pages: z.number().int().positive(),
  /** ISO 639-1 language code, e.g. "pl". */
  language: z.string().regex(/^[a-z]{2}$/, 'Expected an ISO 639-1 code (2 lowercase letters)'),
  type: DocumentTypeSchema,
  title: z.string().min(1),
  date: IsoDateSchema.nullable(),
})

export const AmountSchema = z.object({
  value: z.number(),
  /** ISO 4217 currency code, e.g. "PLN". */
  currency: z.string().regex(/^[A-Z]{3}$/, 'Expected an ISO 4217 code (3 uppercase letters)'),
  context: z.string().min(1),
})

export const DateMentionSchema = z.object({
  date: IsoDateSchema,
  context: z.string().min(1),
})

export const EntitiesSchema = z.object({
  organizations: z.array(z.string().min(1)),
  people: z.array(z.string().min(1)),
})

export const AnalysisResultSchema = z.object({
  document: DocumentInfoSchema,
  /** 3–5 sentences (sentence count is not enforced by the schema). */
  summary: z.string().min(1),
  keyPoints: z.array(z.string().min(1)).min(3).max(7),
  entities: EntitiesSchema,
  amounts: z.array(AmountSchema),
  dates: z.array(DateMentionSchema),
  keywords: z.array(z.string().min(1)),
})

export type DocumentType = z.infer<typeof DocumentTypeSchema>
export type DocumentInfo = z.infer<typeof DocumentInfoSchema>
export type Amount = z.infer<typeof AmountSchema>
export type DateMention = z.infer<typeof DateMentionSchema>
export type Entities = z.infer<typeof EntitiesSchema>
export type AnalysisResult = z.infer<typeof AnalysisResultSchema>
