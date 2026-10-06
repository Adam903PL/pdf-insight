import { describe, expect, it } from 'vitest'
import {
  DEFAULT_HISTORY_FILTERS,
  filterHistory,
  hasActiveFilters,
  normalizeSearchText,
  type HistoryFilters,
} from './filterHistory'
import type { HistoryEntry } from './history'
import type { DocumentType } from './schema'

type EntryOptions = {
  id: string
  title?: string
  fileName?: string
  type?: DocumentType
  createdAt?: string
  withAmount?: boolean
}

function entry(options: EntryOptions): HistoryEntry {
  const { id, title = 'Dokument', fileName = 'plik.pdf', type = 'inne' } = options
  return {
    id,
    createdAt: options.createdAt ?? '2026-10-06T10:00:00.000Z',
    result: {
      document: { fileName, pages: 1, language: 'pl', type, title, date: null },
      summary: 'Streszczenie o fakturze, którego wyszukiwarka nie przeszukuje.',
      keyPoints: ['a', 'b', 'c'],
      entities: { organizations: [], people: [] },
      amounts: options.withAmount ? [{ value: 100, currency: 'PLN', context: 'opłata' }] : [],
      dates: [],
      keywords: [],
    },
  }
}

function filters(overrides: Partial<HistoryFilters>): HistoryFilters {
  return { ...DEFAULT_HISTORY_FILTERS, ...overrides }
}

const ids = (entries: readonly HistoryEntry[]) => entries.map((item) => item.id)

describe('normalizeSearchText', () => {
  it('ignores case and Polish diacritics, including ł', () => {
    expect(normalizeSearchText('  Zażółć GĘŚLĄ jaźń, Łódź ')).toBe('zazolc gesla jazn, lodz')
  })
})

describe('filterHistory', () => {
  const entries = [
    entry({ id: 'a', title: 'Umowa najmu lokalu w Łodzi', fileName: 'najem.pdf', type: 'umowa' }),
    entry({
      id: 'b',
      title: 'Rachunek za prąd',
      fileName: 'energa-październik.pdf',
      type: 'faktura',
    }),
    entry({ id: 'c', title: 'Notatka', fileName: 'notatka.pdf', type: 'inne' }),
  ]

  it('returns every entry, in order, when no filter is set', () => {
    expect(ids(filterHistory(entries, DEFAULT_HISTORY_FILTERS))).toEqual(['a', 'b', 'c'])
  })

  it('matches the title regardless of case and Polish characters', () => {
    expect(ids(filterHistory(entries, filters({ query: 'LODZI' })))).toEqual(['a'])
  })

  it('matches the file name', () => {
    expect(ids(filterHistory(entries, filters({ query: 'pazdziernik' })))).toEqual(['b'])
  })

  it('matches the document type label shown in the list', () => {
    expect(ids(filterHistory(entries, filters({ query: 'faktura' })))).toEqual(['b'])
    expect(ids(filterHistory(entries, filters({ query: 'dokument' })))).toEqual(['c'])
  })

  it('does not search the summary or other result content', () => {
    expect(ids(filterHistory(entries, filters({ query: 'wyszukiwarka' })))).toEqual([])
  })

  it('treats a whitespace-only query as no query', () => {
    expect(ids(filterHistory(entries, filters({ query: '   ' })))).toEqual(['a', 'b', 'c'])
  })

  describe('saved-date range', () => {
    const dated = [
      entry({ id: 'oct-4', createdAt: '2026-10-04T12:00:00.000Z' }),
      entry({ id: 'oct-5', createdAt: '2026-10-05T12:00:00.000Z' }),
      entry({ id: 'oct-6', createdAt: '2026-10-06T12:00:00.000Z' }),
      entry({ id: 'oct-7', createdAt: '2026-10-07T12:00:00.000Z' }),
    ]
    const inUtc = (overrides: Partial<HistoryFilters>) =>
      ids(filterHistory(dated, filters(overrides), 'UTC'))

    it('includes entries saved on either bound', () => {
      expect(inUtc({ createdFrom: '2026-10-05', createdTo: '2026-10-06' })).toEqual([
        'oct-5',
        'oct-6',
      ])
    })

    it('accepts an open-ended range', () => {
      expect(inUtc({ createdFrom: '2026-10-06' })).toEqual(['oct-6', 'oct-7'])
      expect(inUtc({ createdTo: '2026-10-05' })).toEqual(['oct-4', 'oct-5'])
    })

    it('uses the calendar day the viewer saw, not the UTC one', () => {
      // 00:30 on 6 October in Warsaw is still 5 October in UTC.
      const lateNight = [entry({ id: 'night', createdAt: '2026-10-05T22:30:00.000Z' })]
      const range = filters({ createdFrom: '2026-10-06', createdTo: '2026-10-06' })

      expect(ids(filterHistory(lateNight, range, 'Europe/Warsaw'))).toEqual(['night'])
      expect(ids(filterHistory(lateNight, range, 'UTC'))).toEqual([])
    })
  })

  it('keeps only analyses with amounts when asked to', () => {
    const mixed = [entry({ id: 'with', withAmount: true }), entry({ id: 'without' })]

    expect(ids(filterHistory(mixed, filters({ withAmounts: true })))).toEqual(['with'])
  })

  it('combines every active filter with AND', () => {
    const pool = [
      entry({
        id: 'match',
        title: 'Faktura VAT',
        withAmount: true,
        createdAt: '2026-10-06T09:00:00.000Z',
      }),
      entry({ id: 'no-amount', title: 'Faktura VAT', createdAt: '2026-10-06T09:00:00.000Z' }),
      entry({
        id: 'too-old',
        title: 'Faktura VAT',
        withAmount: true,
        createdAt: '2026-09-01T09:00:00.000Z',
      }),
      entry({
        id: 'other-title',
        title: 'Umowa',
        withAmount: true,
        createdAt: '2026-10-06T09:00:00.000Z',
      }),
    ]
    const all = filters({ query: 'vat', createdFrom: '2026-10-01', withAmounts: true })

    expect(ids(filterHistory(pool, all, 'UTC'))).toEqual(['match'])
  })
})

describe('hasActiveFilters', () => {
  it('is false for the defaults and for a blank query', () => {
    expect(hasActiveFilters(DEFAULT_HISTORY_FILTERS)).toBe(false)
    expect(hasActiveFilters(filters({ query: '  ' }))).toBe(false)
  })

  it('is true as soon as any filter is set', () => {
    expect(hasActiveFilters(filters({ query: 'umowa' }))).toBe(true)
    expect(hasActiveFilters(filters({ createdFrom: '2026-10-01' }))).toBe(true)
    expect(hasActiveFilters(filters({ createdTo: '2026-10-01' }))).toBe(true)
    expect(hasActiveFilters(filters({ withAmounts: true }))).toBe(true)
  })
})
