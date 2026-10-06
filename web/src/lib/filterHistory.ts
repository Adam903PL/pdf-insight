import { DOCUMENT_TYPE_LABELS } from './format'
import type { HistoryEntry } from './history'

/** History search and filters: UI state only, never saved. Dates are `YYYY-MM-DD` or ''. */
export type HistoryFilters = {
  query: string
  createdFrom: string
  createdTo: string
  withAmounts: boolean
}

export const DEFAULT_HISTORY_FILTERS: HistoryFilters = {
  query: '',
  createdFrom: '',
  createdTo: '',
  withAmounts: false,
}

/** Lower-case without diacritics, so `lodz` finds `Łódź`. NFD does not split `ł`, hence the extra step. */
export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('pl-PL')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('ł', 'l')
    .trim()
}

export function hasActiveFilters(filters: HistoryFilters): boolean {
  return (
    normalizeSearchText(filters.query) !== '' ||
    filters.createdFrom !== '' ||
    filters.createdTo !== '' ||
    filters.withAmounts
  )
}

/**
 * The calendar day a moment fell on for the viewer, as `YYYY-MM-DD` — the format of
 * `<input type="date">`, so the two compare as strings. Saved timestamps are UTC; the
 * list shows them in local time, and the filter has to agree with the list. The time
 * zone is a parameter only so tests can pin it.
 */
function calendarDayFormatter(timeZone?: string): (isoTimestamp: string) => string {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  return (isoTimestamp) => {
    const parts = format.formatToParts(new Date(isoTimestamp))
    const pick = (type: Intl.DateTimeFormatPartTypes): string => {
      const part = parts.find((candidate) => candidate.type === type)
      if (part === undefined) throw new Error(`Formatted date has no ${type}: ${isoTimestamp}`)
      return part.value
    }
    return `${pick('year')}-${pick('month')}-${pick('day')}`
  }
}

/**
 * The entries matching every active filter (AND), in their original order. The query
 * searches the title, file name and document type label only; date bounds are inclusive.
 */
export function filterHistory(
  entries: readonly HistoryEntry[],
  filters: HistoryFilters,
  timeZone?: string,
): HistoryEntry[] {
  const query = normalizeSearchText(filters.query)
  const { createdFrom, createdTo, withAmounts } = filters
  const calendarDay = calendarDayFormatter(timeZone)

  return entries.filter((entry) => {
    const { title, fileName, type } = entry.result.document
    if (query !== '') {
      const fields = [title, fileName, DOCUMENT_TYPE_LABELS[type]]
      if (!fields.some((field) => normalizeSearchText(field).includes(query))) return false
    }
    if (createdFrom !== '' || createdTo !== '') {
      const day = calendarDay(entry.createdAt)
      if (createdFrom !== '' && day < createdFrom) return false
      if (createdTo !== '' && day > createdTo) return false
    }
    return !withAmounts || entry.result.amounts.length > 0
  })
}
