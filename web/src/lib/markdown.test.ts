import { describe, expect, it } from 'vitest'
import { formatAmount } from './format'
import { markdownFileName, resultToMarkdown } from './markdown'
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
  entities: { organizations: ['Nordvale Systems sp. z o.o.'], people: ['Anna Kowalska'] },
  amounts: [{ value: 18400, currency: 'PLN', context: 'wynagrodzenie' }],
  dates: [
    { date: '2026-12-31', context: 'koniec umowy' },
    { date: '2026-04-01', context: 'początek obowiązywania' },
  ],
  keywords: ['umowa', 'serwis'],
}

describe('resultToMarkdown', () => {
  it('renders every result field as headings and dashed lists, in result-view order', () => {
    expect(resultToMarkdown(result)).toBe(
      [
        '# Umowa serwisowa',
        '',
        '- Rodzaj dokumentu: Umowa',
        '- Plik: umowa.pdf',
        '- Data dokumentu: 12 marca 2026',
        '- Objętość: 3 strony',
        '- Język: polski',
        '',
        '## Streszczenie',
        '',
        'Umowa serwisowa na rok. Obejmuje wsparcie techniczne.',
        '',
        '## Najważniejsze punkty',
        '',
        '- Zakres usług',
        '- Wynagrodzenie miesięczne',
        '- Okres wypowiedzenia',
        '',
        '## Organizacje i osoby',
        '',
        '### Organizacje',
        '',
        '- Nordvale Systems sp. z o.o.',
        '',
        '### Osoby',
        '',
        '- Anna Kowalska',
        '',
        '## Kwoty',
        '',
        `- ${formatAmount(18400, 'PLN')} — wynagrodzenie`,
        '',
        '## Daty',
        '',
        '- 1 kwietnia 2026 — początek obowiązywania',
        '- 31 grudnia 2026 — koniec umowy',
        '',
        '## Słowa kluczowe',
        '',
        '- umowa',
        '- serwis',
        '',
      ].join('\n'),
    )
  })

  it('omits the document date when the document has none', () => {
    const undated = { ...result, document: { ...result.document, date: null } }

    expect(resultToMarkdown(undated)).not.toContain('Data dokumentu')
  })

  it('omits empty sections and groups instead of inventing content', () => {
    const sparse: AnalysisResult = {
      ...result,
      entities: { organizations: [], people: ['Anna Kowalska'] },
      amounts: [],
      dates: [],
      keywords: [],
    }
    const markdown = resultToMarkdown(sparse)

    expect(markdown).toContain('### Osoby')
    expect(markdown).not.toContain('### Organizacje')
    expect(markdown).not.toContain('## Kwoty')
    expect(markdown).not.toContain('## Daty')
    expect(markdown).not.toContain('## Słowa kluczowe')
  })

  it('drops the entities section when both groups are empty', () => {
    const noEntities = { ...result, entities: { organizations: [], people: [] } }

    expect(resultToMarkdown(noEntities)).not.toContain('## Organizacje i osoby')
  })

  it('keeps the title and list items on a single line', () => {
    const multiline: AnalysisResult = {
      ...result,
      document: { ...result.document, title: 'Umowa\nserwisowa' },
      keyPoints: ['Zakres\nusług', 'Termin', 'Kary'],
    }
    const markdown = resultToMarkdown(multiline)

    expect(markdown.startsWith('# Umowa serwisowa\n')).toBe(true)
    expect(markdown).toContain('\n- Zakres usług\n')
  })
})

describe('markdownFileName', () => {
  it('names the file after the PDF, like the JSON export', () => {
    expect(markdownFileName('Umowa serwisowa.PDF')).toBe('Umowa serwisowa-analiza.md')
  })

  it('replaces path separators and characters Windows forbids', () => {
    expect(markdownFileName('faktura: 01/2026?.pdf')).toBe('faktura_ 01_2026_-analiza.md')
  })
})
