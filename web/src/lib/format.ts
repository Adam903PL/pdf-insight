import type { DocumentType } from './schema'

/** Display names for the schema's document types, as printed on the stamp. */
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  faktura: 'Faktura',
  umowa: 'Umowa',
  oferta: 'Oferta',
  raport: 'Raport',
  inne: 'Dokument',
}

export function formatAmount(value: number, currency: string): string {
  return new Intl.NumberFormat('pl-PL', { style: 'currency', currency }).format(value)
}

// Schema dates are calendar dates, so format them in UTC: a local time zone west of
// Greenwich would otherwise show the previous day.
const CALENDAR_DATE = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
})

/** `2026-03-12` → `12 marca 2026`. */
export function formatIsoDate(isoDate: string): string {
  return CALENDAR_DATE.format(new Date(`${isoDate}T00:00:00Z`))
}

const PAGE_WORDS: Record<Intl.LDMLPluralRule, string> = {
  zero: 'stron',
  one: 'strona',
  two: 'strony',
  few: 'strony',
  many: 'stron',
  other: 'strony',
}
const POLISH_PLURAL = new Intl.PluralRules('pl-PL')

/** `1 strona`, `3 strony`, `5 stron`, `22 strony`. */
export function formatPages(count: number): string {
  return `${count} ${PAGE_WORDS[POLISH_PLURAL.select(count)]}`
}

const LANGUAGE_NAMES = new Intl.DisplayNames(['pl'], { type: 'language' })

/** ISO 639-1 code → Polish language name (`pl` → `polski`), or the code if unknown. */
export function languageName(code: string): string {
  return LANGUAGE_NAMES.of(code) ?? code
}

/** Chronological order; ISO 8601 calendar dates sort correctly as strings. */
export function sortByDate<T extends { date: string }>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * A moment in the viewer's local time: `16 wrz 2026, 14:03`. The time zone is a
 * parameter only so tests can pin it.
 */
export function formatTimestamp(isoTimestamp: string, timeZone?: string): string {
  return new Intl.DateTimeFormat('pl-PL', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(isoTimestamp))
}
