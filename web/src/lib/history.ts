import type { AnalysisResult } from './schema'

export const HISTORY_STORAGE_KEY = 'pdf-insight:history'

export type HistoryEntry = {
  id: string
  /** ISO 8601 timestamp of when the analysis finished. */
  createdAt: string
  result: AnalysisResult
}

/** Reads saved analyses from localStorage, newest first. */
export function loadHistory(): HistoryEntry[] {
  // TODO: JSON.parse + Zod validation; decide explicitly what happens with corrupted storage.
  throw new Error('Not implemented')
}

/** Persists one analysis in localStorage. */
export function saveHistoryEntry(_entry: HistoryEntry): void {
  // TODO: prepend, cap the number of entries, handle QuotaExceededError explicitly.
  throw new Error('Not implemented')
}

/** Removes all saved analyses. */
export function clearHistory(): void {
  throw new Error('Not implemented')
}
