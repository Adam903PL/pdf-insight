import { describe, expect, it } from 'vitest'
import { AnalysisResultSchema, type AnalysisResult } from './schema'

function validResult(): AnalysisResult {
  return {
    document: {
      fileName: 'umowa.pdf',
      pages: 4,
      language: 'pl',
      type: 'umowa',
      title: 'Umowa serwisowa',
      date: '2026-09-01',
    },
    summary:
      'Umowa serwisowa między dwiema spółkami. Określa zakres usług i wynagrodzenie. Termin płatności to 1 października 2026.',
    keyPoints: ['Zakres usług serwisowych', 'Wynagrodzenie 12 500 PLN', 'Termin płatności 30 dni'],
    entities: {
      organizations: ['Acme sp. z o.o.'],
      people: [],
    },
    amounts: [{ value: 12500.0, currency: 'PLN', context: 'wynagrodzenie' }],
    dates: [{ date: '2026-10-01', context: 'termin płatności' }],
    keywords: ['umowa', 'serwis'],
  }
}

function keyPoints(count: number): string[] {
  return Array.from({ length: count }, (_, index) => `Punkt ${index + 1}`)
}

describe('AnalysisResultSchema', () => {
  it('accepts a valid result', () => {
    expect(AnalysisResultSchema.safeParse(validResult()).success).toBe(true)
  })

  it('rejects a result with a missing required field', () => {
    const input: Partial<AnalysisResult> = validResult()
    delete input.summary

    const parsed = AnalysisResultSchema.safeParse(input)

    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues[0]?.path).toEqual(['summary'])
  })

  it.each([0, 2, 8])('rejects keyPoints with %i items', (count) => {
    const input = { ...validResult(), keyPoints: keyPoints(count) }

    expect(AnalysisResultSchema.safeParse(input).success).toBe(false)
  })

  it.each([3, 7])('accepts keyPoints with %i items (boundary)', (count) => {
    const input = { ...validResult(), keyPoints: keyPoints(count) }

    expect(AnalysisResultSchema.safeParse(input).success).toBe(true)
  })

  it('accepts null as document.date', () => {
    const base = validResult()
    const input = { ...base, document: { ...base.document, date: null } }

    expect(AnalysisResultSchema.safeParse(input).success).toBe(true)
  })

  it('rejects a date that is not ISO 8601', () => {
    const base = validResult()
    const input = { ...base, document: { ...base.document, date: '01.09.2026' } }

    expect(AnalysisResultSchema.safeParse(input).success).toBe(false)
  })

  it('rejects an unknown document type', () => {
    const base = validResult()
    const input = { ...base, document: { ...base.document, type: 'list' } }

    expect(AnalysisResultSchema.safeParse(input).success).toBe(false)
  })

  it('rejects a currency that is not an ISO 4217 code', () => {
    const input = { ...validResult(), amounts: [{ value: 100, currency: 'zł', context: 'kaucja' }] }

    expect(AnalysisResultSchema.safeParse(input).success).toBe(false)
  })

  it('accepts empty entities, amounts, dates and keywords', () => {
    const input = {
      ...validResult(),
      entities: { organizations: [], people: [] },
      amounts: [],
      dates: [],
      keywords: [],
    }

    expect(AnalysisResultSchema.safeParse(input).success).toBe(true)
  })
})
