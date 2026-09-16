import { useId } from 'react'
import { DOCUMENT_TYPE_LABELS, formatTimestamp } from '@/lib/format'
import type { HistoryEntry } from '@/lib/history'

export type HistoryPanelProps = {
  entries: readonly HistoryEntry[]
  /** Polish notice when the browser blocked, filled or corrupted the saved history. */
  warning: string | null
  /** The entry currently shown in the result view, if any. */
  activeId: string | null
  disabled: boolean
  onSelect: (entry: HistoryEntry) => void
  onClear: () => void
}

export function HistoryPanel(props: HistoryPanelProps) {
  const { entries, warning, activeId, disabled, onSelect, onClear } = props
  const headingId = useId()

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={headingId} className="text-lg font-semibold">
          Ostatnie analizy
        </h2>
        {entries.length > 0 && (
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="min-h-11 text-sm font-medium text-ink-muted underline decoration-ink/30 underline-offset-4 hover:text-ink hover:decoration-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Wyczyść historię
          </button>
        )}
      </div>

      {warning !== null && (
        <p role="status" className="mt-2 text-sm text-alert">
          {warning}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">
          Tu pojawią się ostatnie analizy. Są zapisywane wyłącznie w tej przeglądarce.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
          {entries.map((entry) => {
            const active = entry.id === activeId
            const { title, type } = entry.result.document
            return (
              <li key={entry.id}>
                <button
                  type="button"
                  onClick={() => onSelect(entry)}
                  disabled={disabled}
                  aria-current={active ? 'true' : undefined}
                  className={`flex w-full flex-col items-start gap-0.5 border-l-[3px] py-3 pr-2 pl-3 text-left transition-colors hover:bg-sheet/70 disabled:cursor-not-allowed disabled:opacity-60 ${
                    active ? 'border-stamp bg-sheet' : 'border-transparent'
                  }`}
                >
                  <span className="line-clamp-2 font-medium break-words">{title}</span>
                  <span className="text-sm text-ink-muted">
                    {DOCUMENT_TYPE_LABELS[type]}, {formatTimestamp(entry.createdAt)}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
