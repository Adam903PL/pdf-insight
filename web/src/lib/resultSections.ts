import { formatAmount, formatIsoDate, sortByDate } from './format'
import type { Amount, AnalysisResult, DateMention } from './schema'

/** Result section titles in display order; the keys double as in-page anchor ids. */
export const SECTION_TITLES = {
  summary: 'Streszczenie',
  'key-points': 'Najważniejsze punkty',
  entities: 'Organizacje i osoby',
  amounts: 'Kwoty',
  dates: 'Daty',
  keywords: 'Słowa kluczowe',
} as const

export type ResultSectionId = keyof typeof SECTION_TITLES

// String keys keep insertion order, so this is the display order above.
export const RESULT_SECTIONS = (Object.keys(SECTION_TITLES) as ResultSectionId[]).map((id) => ({
  id,
  title: SECTION_TITLES[id],
}))

/** What the view shows for a section with nothing in it. */
export const NOT_FOUND = 'Nie znaleziono w dokumencie.'

/**
 * Model output may contain line breaks; a list item has to stay on one line. No-break
 * spaces survive: `Intl` puts them inside formatted amounts on purpose.
 */
export function singleLine(text: string): string {
  return text.replace(/[^\S\u00a0\u202f]+/g, ' ').trim()
}

export function bulletList(items: readonly string[]): string {
  return items.map((item) => `- ${singleLine(item)}`).join('\n')
}

/** `18 400,00 zł — wynagrodzenie`, as in the amounts table. */
export function amountLine(amount: Amount): string {
  return `${formatAmount(amount.value, amount.currency)} — ${amount.context}`
}

/** `1 kwietnia 2026 — początek obowiązywania`, as in the dates list. */
export function dateLine(mention: DateMention): string {
  return `${formatIsoDate(mention.date)} — ${mention.context}`
}

function namesText(label: string, names: readonly string[]): string {
  return `${label}:\n${names.length === 0 ? 'Brak' : bulletList(names)}`
}

/** One section as readable plain text for the clipboard: what the section shows, no markup. */
export function sectionText(result: AnalysisResult, id: ResultSectionId): string {
  const { summary, keyPoints, entities, amounts, dates, keywords } = result
  switch (id) {
    case 'summary':
      return summary
    case 'key-points':
      return bulletList(keyPoints)
    case 'entities':
      return `${namesText('Organizacje', entities.organizations)}\n\n${namesText('Osoby', entities.people)}`
    case 'amounts':
      return amounts.length === 0 ? NOT_FOUND : bulletList(amounts.map(amountLine))
    case 'dates':
      return dates.length === 0 ? NOT_FOUND : bulletList(sortByDate(dates).map(dateLine))
    case 'keywords':
      return keywords.length === 0 ? NOT_FOUND : keywords.map(singleLine).join(', ')
  }
}
