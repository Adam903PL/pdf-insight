import type { HistoryEntry } from './history'

/** Side by side means two: a third selection is refused, not swapped in. */
export const MAX_COMPARED = 2

export type ComparisonPair = readonly [HistoryEntry, HistoryEntry]

/** Selects or deselects an analysis for comparison, never going past MAX_COMPARED. */
export function toggleCompareId(ids: readonly string[], id: string): string[] {
  if (ids.includes(id)) return ids.filter((selected) => selected !== id)
  if (ids.length >= MAX_COMPARED) return [...ids]
  return [...ids, id]
}

/**
 * The two selected analyses, looked up in the full history (never the filtered list),
 * in selection order — or null while the pair is incomplete.
 */
export function resolveComparison(
  entries: readonly HistoryEntry[],
  ids: readonly string[],
): ComparisonPair | null {
  const [firstId, secondId] = ids
  const first = entries.find((item) => item.id === firstId)
  const second = entries.find((item) => item.id === secondId)
  return first !== undefined && second !== undefined ? [first, second] : null
}

/** Keeps only the selections still in history (the newest-ten cap can drop one). */
export function pruneCompareIds(
  ids: readonly string[],
  entries: readonly HistoryEntry[],
): string[] {
  return ids.filter((id) => entries.some((item) => item.id === id))
}
