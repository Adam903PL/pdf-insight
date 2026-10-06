import { describe, expect, it } from 'vitest'
import { formatAmount } from './format'
import { NOT_FOUND, RESULT_SECTIONS, sectionText } from './resultSections'
import type { AnalysisResult } from './schema'

const result: AnalysisResult = {
  document: {
    fileName: 'umowa.pdf',
    pages: 3,
    language: 'pl',
    type: 'umowa',
    title: 'Umowa serwisowa',
    date: '2026-03-12',
  },
  summary: 'Umowa serwisowa na rok. Obejmuje wsparcie techniczne.',
  keyPoints: ['Zakres usług', 'Wynagrodzenie miesięczne', 'Okres wypowiedzenia'],
  entities: { organizations: ['Nordvale Systems sp. z o.o.'], people: [] },
  amounts: [{ value: 18400, currency: 'PLN', context: 'wynagrodzenie' }],
  dates: [
    { date: '2026-12-31', context: 'koniec umowy' },
    { date: '2026-04-01', context: 'początek obowiązywania' },
  ],
  keywords: ['umowa', 'serwis'],
}

describe('RESULT_SECTIONS', () => {
  it('lists the six result sections in display order with stable anchor ids', () => {
    expect(RESULT_SECTIONS.map((section) => section.id)).toEqual([
      'summary',
      'key-points',
      'entities',
      'amounts',
      'dates',
      'keywords',
    ])
  })
})

describe('sectionText', () => {
  it('copies the summary as it is', () => {
    expect(sectionText(result, 'summary')).toBe(result.summary)
  })

  it('copies key points as a dashed list', () => {
    expect(sectionText(result, 'key-points')).toBe(
      '- Zakres usług\n- Wynagrodzenie miesięczne\n- Okres wypowiedzenia',
    )
  })

  it('copies organizations and people under their own labels, marking an empty group', () => {
    expect(sectionText(result, 'entities')).toBe(
      'Organizacje:\n- Nordvale Systems sp. z o.o.\n\nOsoby:\nBrak',
    )
  })

  it('copies amounts formatted like the table, with what they refer to', () => {
    expect(sectionText(result, 'amounts')).toBe(`- ${formatAmount(18400, 'PLN')} — wynagrodzenie`)
  })

  it('copies dates in chronological order', () => {
    expect(sectionText(result, 'dates')).toBe(
      '- 1 kwietnia 2026 — początek obowiązywania\n- 31 grudnia 2026 — koniec umowy',
    )
  })

  it('copies keywords as one comma-separated line', () => {
    expect(sectionText(result, 'keywords')).toBe('umowa, serwis')
  })

  it('says nothing was found for an empty section, as the view does', () => {
    const empty = { ...result, amounts: [], dates: [], keywords: [] }

    expect(sectionText(empty, 'amounts')).toBe(NOT_FOUND)
    expect(sectionText(empty, 'dates')).toBe(NOT_FOUND)
    expect(sectionText(empty, 'keywords')).toBe(NOT_FOUND)
  })

  it('keeps every list item on a single line', () => {
    const multiline = { ...result, keyPoints: ['Zakres\nusług', 'Termin', 'Kary  umowne'] }

    expect(sectionText(multiline, 'key-points')).toBe('- Zakres usług\n- Termin\n- Kary umowne')
  })
})
