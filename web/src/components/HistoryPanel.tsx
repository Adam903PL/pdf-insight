import type { HistoryEntry } from '@/lib/history'

export type HistoryPanelProps = {
  entries: readonly HistoryEntry[]
  onSelect: (entry: HistoryEntry) => void
}

export function HistoryPanel({ entries, onSelect }: HistoryPanelProps) {
  // TODO: empty state, clear action, formatted dates.
  return (
    <aside className="space-y-2">
      <h2 className="text-lg font-semibold">Historia</h2>
      <ul>
        {entries.map((entry) => (
          <li key={entry.id}>
            <button type="button" onClick={() => onSelect(entry)}>
              {entry.result.document.fileName}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
