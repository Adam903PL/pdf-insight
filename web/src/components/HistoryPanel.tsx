import { useId, useRef, useState } from 'react'
import {
  DEFAULT_HISTORY_FILTERS,
  filterHistory,
  hasActiveFilters,
  type HistoryFilters,
} from '@/lib/filterHistory'
import { DOCUMENT_TYPE_LABELS, formatTimestamp } from '@/lib/format'
import type { HistoryEntry } from '@/lib/history'

export type HistoryPanelProps = {
  entries: readonly HistoryEntry[]
  /** Polish notice when the browser blocked, filled or corrupted the saved history. */
  warning: string | null
  /** The entry currently shown in the result view, if any. */
  activeId: string | null
  disabled: boolean
  /** Changing it restores the default search and filters (e.g. after clearing history). */
  filtersResetKey: number
  onSelect: (entry: HistoryEntry) => void
  onClear: () => void
}

const fieldClass =
  'min-h-11 w-full rounded-md border border-ink/25 bg-sheet px-3 text-sm text-ink placeholder:text-ink-muted/80'

const linkButton =
  'min-h-11 text-sm font-medium text-ink-muted underline decoration-ink/30 underline-offset-4 hover:text-ink hover:decoration-ink disabled:cursor-not-allowed disabled:opacity-60'

export function HistoryPanel(props: HistoryPanelProps) {
  const { entries, warning, activeId, disabled, filtersResetKey, onSelect, onClear } = props
  const headingId = useId()
  const searchId = useId()
  const fromId = useId()
  const toId = useId()
  const searchRef = useRef<HTMLInputElement>(null)

  // Filters remember the reset key they were set under; a new key means defaults again —
  // derived during render, no effect needed.
  const [stored, setStored] = useState({
    resetKey: filtersResetKey,
    filters: DEFAULT_HISTORY_FILTERS,
  })
  const filters = stored.resetKey === filtersResetKey ? stored.filters : DEFAULT_HISTORY_FILTERS
  const filtering = hasActiveFilters(filters)
  const visibleEntries = filterHistory(entries, filters)

  const updateFilters = (change: Partial<HistoryFilters>): void => {
    setStored({ resetKey: filtersResetKey, filters: { ...filters, ...change } })
  }

  // The button pressed disappears with the filters, so focus moves to the search field.
  const resetFilters = (): void => {
    setStored({ resetKey: filtersResetKey, filters: DEFAULT_HISTORY_FILTERS })
    searchRef.current?.focus()
  }

  return (
    <section aria-labelledby={headingId}>
      <div className="flex items-center justify-between gap-4">
        <h2 id={headingId} className="text-lg font-semibold">
          Ostatnie analizy
        </h2>
        {entries.length > 0 && (
          <button type="button" onClick={onClear} disabled={disabled} className={linkButton}>
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
        <>
          <div role="search" aria-label="Filtry historii" className="mt-3 space-y-3">
            <div>
              <label htmlFor={searchId} className="text-sm text-ink-muted">
                Szukaj w historii
              </label>
              <input
                ref={searchRef}
                id={searchId}
                type="search"
                value={filters.query}
                onChange={(event) => updateFilters({ query: event.target.value })}
                placeholder="Tytuł, nazwa pliku lub typ"
                autoComplete="off"
                className={`${fieldClass} mt-1`}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor={fromId} className="text-sm text-ink-muted">
                  Zapisano od
                </label>
                <input
                  id={fromId}
                  type="date"
                  value={filters.createdFrom}
                  max={filters.createdTo || undefined}
                  onChange={(event) => updateFilters({ createdFrom: event.target.value })}
                  className={`${fieldClass} mt-1`}
                />
              </div>
              <div>
                <label htmlFor={toId} className="text-sm text-ink-muted">
                  Zapisano do
                </label>
                <input
                  id={toId}
                  type="date"
                  value={filters.createdTo}
                  min={filters.createdFrom || undefined}
                  onChange={(event) => updateFilters({ createdTo: event.target.value })}
                  className={`${fieldClass} mt-1`}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-x-4">
              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.withAmounts}
                  onChange={(event) => updateFilters({ withAmounts: event.target.checked })}
                  className="size-4 accent-stamp"
                />
                Zawiera kwoty
              </label>
              {filtering && (
                <button type="button" onClick={resetFilters} className={linkButton}>
                  Wyczyść filtry
                </button>
              )}
            </div>

            {/* Typing never moves focus, so the match count is announced instead. */}
            <p aria-live="polite" className="text-sm text-ink-muted">
              {filtering ? `Pasujące analizy: ${visibleEntries.length} z ${entries.length}.` : ''}
            </p>
          </div>

          {visibleEntries.length === 0 ? (
            <div className="mt-3 rounded-md border border-dashed border-ink/25 px-4 py-5 text-sm">
              <p>Nie znaleziono analiz dla tych filtrów.</p>
              <button type="button" onClick={resetFilters} className={`${linkButton} mt-1`}>
                Pokaż wszystkie analizy
              </button>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-ink/10 border-y border-ink/10">
              {visibleEntries.map((entry) => {
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
        </>
      )}
    </section>
  )
}
