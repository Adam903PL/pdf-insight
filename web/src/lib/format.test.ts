import { describe, expect, it } from 'vitest'
import {
  formatAmount,
  formatIsoDate,
  formatPages,
  formatTimestamp,
  languageName,
  sortByDate,
} from './format'

/** Intl output uses (narrow) no-break spaces; compare with ordinary ones. */
function plainSpaces(text: string): string {
  return text.replace(/\s/g, ' ')
}

describe('formatAmount', () => {
  it('formats PLN the Polish way', () => {
    expect(plainSpaces(formatAmount(18400, 'PLN'))).toBe('18 400,00 zł')
  })

  it('keeps other ISO 4217 currencies', () => {
    expect(plainSpaces(formatAmount(1500.5, 'EUR'))).toBe('1500,50 €')
  })
})

describe('formatIsoDate', () => {
  it('writes the month in the genitive form', () => {
    expect(formatIsoDate('2026-03-12')).toBe('12 marca 2026')
  })

  it('does not shift a calendar date by the local time zone', () => {
    expect(formatIsoDate('2027-01-01')).toBe('1 stycznia 2027')
  })
})

describe('formatPages', () => {
  it.each([
    [1, '1 strona'],
    [3, '3 strony'],
    [5, '5 stron'],
    [12, '12 stron'],
    [22, '22 strony'],
    [25, '25 stron'],
  ])('%i → %s', (count, expected) => {
    expect(formatPages(count)).toBe(expected)
  })
})

describe('languageName', () => {
  it('names the language in Polish', () => {
    expect(languageName('pl')).toBe('polski')
    expect(languageName('en')).toBe('angielski')
  })
})

describe('sortByDate', () => {
  it('orders dates chronologically without mutating the input', () => {
    const dates = [
      { date: '2027-03-31', context: 'koniec' },
      { date: '2026-03-12', context: 'zawarcie' },
      { date: '2026-04-01', context: 'początek' },
    ]

    expect(sortByDate(dates).map((entry) => entry.context)).toEqual([
      'zawarcie',
      'początek',
      'koniec',
    ])
    expect(dates[0]?.context).toBe('koniec')
  })
})

describe('formatTimestamp', () => {
  it('shows a short Polish date with the time', () => {
    const formatted = formatTimestamp('2026-09-16T14:03:00.000Z', 'UTC')

    expect(plainSpaces(formatted)).toBe('16 wrz 2026, 14:03')
  })
})
