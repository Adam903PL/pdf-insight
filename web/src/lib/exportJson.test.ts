import { describe, expect, it } from 'vitest'
import { jsonFileName, serializeResult } from './exportJson'
import { AnalysisResultSchema, type AnalysisResult } from './schema'

const result: AnalysisResult = {
  document: {
    fileName: 'umowa.pdf',
    pages: 3,
    language: 'pl',
    type: 'umowa',
    title: 'Umowa serwisowa',
    date: null,
  },
  summary: 'Umowa serwisowa. Zakres usług. Wynagrodzenie.',
  keyPoints: ['Zakres', 'Wynagrodzenie', 'Termin'],
  entities: { organizations: ['Nordvale Systems sp. z o.o.'], people: [] },
  amounts: [{ value: 18400, currency: 'PLN', context: 'wynagrodzenie' }],
  dates: [{ date: '2026-04-01', context: 'początek obowiązywania' }],
  keywords: ['umowa'],
}

describe('serializeResult', () => {
  it('produces a file that parses back into a schema-valid result', () => {
    const parsed = AnalysisResultSchema.safeParse(JSON.parse(serializeResult(result)))

    expect(parsed.success).toBe(true)
    expect(parsed.data).toEqual(result)
  })

  it('is pretty-printed and ends with a newline', () => {
    const json = serializeResult(result)

    expect(json).toContain('\n  "document": {')
    expect(json.endsWith('}\n')).toBe(true)
  })
})

describe('jsonFileName', () => {
  it('replaces the .pdf extension, case-insensitively', () => {
    expect(jsonFileName('Umowa serwisowa.PDF')).toBe('Umowa serwisowa-analiza.json')
  })

  it('replaces characters Windows forbids in file names', () => {
    expect(jsonFileName('faktura: 01/2026?.pdf')).toBe('faktura_ 01_2026_-analiza.json')
  })

  it('drops trailing dots and spaces', () => {
    expect(jsonFileName('raport... .pdf')).toBe('raport-analiza.json')
  })

  it('falls back to a generic name when nothing usable is left', () => {
    expect(jsonFileName('.pdf')).toBe('dokument-analiza.json')
  })
})
