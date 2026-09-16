import { z } from 'zod'
import { AnalysisResultSchema, type AnalysisResult } from './schema'

export const HISTORY_STORAGE_KEY = 'pdf-insight:history'
export const MAX_HISTORY_ENTRIES = 10

const HistoryEntrySchema = z.object({
  id: z.string().min(1),
  /** ISO 8601 timestamp of when the analysis finished. */
  createdAt: z.iso.datetime(),
  result: AnalysisResultSchema,
})

export type HistoryEntry = z.infer<typeof HistoryEntrySchema>

/** Entries, newest first, plus a Polish notice when storage did not behave. */
export type HistoryState = {
  entries: HistoryEntry[]
  warning: string | null
}

export type HistoryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export const HISTORY_WARNINGS = {
  unavailable:
    'Historia jest niedostępna, bo przeglądarka blokuje zapis danych dla tej strony. Wyniki znikną po odświeżeniu.',
  corrupted: 'Część zapisanej historii była uszkodzona i została usunięta.',
  full: 'Nie udało się zapisać analizy w historii: brak miejsca w pamięci przeglądarki.',
} as const

/** Reading `window.localStorage` itself throws when site data is blocked. */
function browserStorage(): HistoryStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function isQuotaExceeded(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'QuotaExceededError'
}

export function createHistoryEntry(result: AnalysisResult, now: Date = new Date()): HistoryEntry {
  return { id: crypto.randomUUID(), createdAt: now.toISOString(), result }
}

/**
 * Reads saved analyses. Every entry is re-validated: anything that no longer matches
 * the schema (an older app version, a manual edit) is removed from storage and
 * reported, never shown and never allowed to crash the page.
 */
export function loadHistory(storage: HistoryStorage | null = browserStorage()): HistoryState {
  if (storage === null) {
    return { entries: [], warning: HISTORY_WARNINGS.unavailable }
  }

  const raw = storage.getItem(HISTORY_STORAGE_KEY)
  if (raw === null) {
    return { entries: [], warning: null }
  }

  let stored: unknown
  try {
    stored = JSON.parse(raw)
  } catch {
    storage.removeItem(HISTORY_STORAGE_KEY)
    return { entries: [], warning: HISTORY_WARNINGS.corrupted }
  }

  const candidates: unknown[] = Array.isArray(stored) ? stored : []
  const valid = candidates
    .map((candidate) => HistoryEntrySchema.safeParse(candidate))
    .flatMap((parsed) => (parsed.success ? [parsed.data] : []))
  const entries = valid.slice(0, MAX_HISTORY_ENTRIES)

  // Count before trimming, so a damaged entry past the cap is still noticed.
  const damaged = !Array.isArray(stored) || valid.length < candidates.length
  if (damaged) {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries))
  }
  return { entries, warning: damaged ? HISTORY_WARNINGS.corrupted : null }
}

/**
 * Prepends an entry and keeps the newest MAX_HISTORY_ENTRIES. When the browser refuses
 * to store it, the entry still stays in the returned list for this session and the
 * reason is reported.
 */
export function addHistoryEntry(
  current: readonly HistoryEntry[],
  entry: HistoryEntry,
  storage: HistoryStorage | null = browserStorage(),
): HistoryState {
  const entries = [entry, ...current].slice(0, MAX_HISTORY_ENTRIES)

  if (storage === null) {
    return { entries, warning: HISTORY_WARNINGS.unavailable }
  }
  try {
    storage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries))
  } catch (error) {
    if (isQuotaExceeded(error)) {
      return { entries, warning: HISTORY_WARNINGS.full }
    }
    throw error
  }
  return { entries, warning: null }
}

/** Removes all saved analyses. */
export function clearHistory(storage: HistoryStorage | null = browserStorage()): HistoryState {
  if (storage === null) {
    return { entries: [], warning: HISTORY_WARNINGS.unavailable }
  }
  storage.removeItem(HISTORY_STORAGE_KEY)
  return { entries: [], warning: null }
}
