import { useEffect, useId, useRef, type ReactNode } from 'react'
import type { ComparisonPair } from '@/lib/comparison'
import { focusAndReveal } from '@/lib/focus'
import {
  DOCUMENT_TYPE_LABELS,
  formatAmount,
  formatIsoDate,
  formatTimestamp,
  sortByDate,
} from '@/lib/format'
import type { HistoryEntry } from '@/lib/history'
import { NOT_FOUND, SECTION_TITLES } from '@/lib/resultSections'
import { secondaryButton } from './styles'

export type ComparisonViewProps = {
  entries: ComparisonPair
  onClose: () => void
}

/**
 * One section of a column. On wide screens both columns share the parent's rows
 * (subgrid), so the same section starts at the same height on both sides.
 */
function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="border-t border-rule pt-4">
      <h4 className="text-sm font-semibold">{title}</h4>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Names({ label, names }: { label: string; names: string[] }) {
  return (
    <div>
      <p className="text-ink-muted">{label}</p>
      {names.length === 0 ? (
        <p className="text-ink-muted">Brak</p>
      ) : (
        <ul className="space-y-0.5">
          {names.map((name, index) => (
            <li key={`${index}-${name}`}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Column({ entry, label }: { entry: HistoryEntry; label: string }) {
  const titleId = useId()
  const { document: documentInfo, summary, keyPoints, entities, amounts, dates } = entry.result

  return (
    <section
      aria-labelledby={titleId}
      className="min-w-0 space-y-5 text-sm leading-relaxed break-words md:row-span-6 md:grid md:grid-rows-subgrid md:space-y-0"
    >
      <header>
        <p className="font-semibold text-stamp">
          {label} · {DOCUMENT_TYPE_LABELS[documentInfo.type]}
        </p>
        <h3 id={titleId} className="mt-1 text-xl leading-snug font-bold tracking-tight">
          {documentInfo.title}
        </h3>
        <p className="mt-1 text-ink-muted">
          {documentInfo.fileName}, zapisano {formatTimestamp(entry.createdAt)}
        </p>
      </header>

      <Block title={SECTION_TITLES.summary}>
        <p className="font-serif text-base leading-relaxed">{summary}</p>
      </Block>

      <Block title={SECTION_TITLES['key-points']}>
        <ul className="list-disc space-y-1.5 pl-5 marker:text-stamp">
          {keyPoints.map((point, index) => (
            <li key={`${index}-${point}`}>{point}</li>
          ))}
        </ul>
      </Block>

      <Block title={SECTION_TITLES.entities}>
        <div className="space-y-3">
          <Names label="Organizacje" names={entities.organizations} />
          <Names label="Osoby" names={entities.people} />
        </div>
      </Block>

      <Block title={SECTION_TITLES.amounts}>
        {amounts.length === 0 ? (
          <p className="text-ink-muted">{NOT_FOUND}</p>
        ) : (
          <ul className="space-y-1.5">
            {amounts.map((amount, index) => (
              <li key={index}>
                <span className="font-semibold whitespace-nowrap">
                  {formatAmount(amount.value, amount.currency)}
                </span>{' '}
                — {amount.context}
              </li>
            ))}
          </ul>
        )}
      </Block>

      <Block title={SECTION_TITLES.dates}>
        {dates.length === 0 ? (
          <p className="text-ink-muted">{NOT_FOUND}</p>
        ) : (
          <ol className="space-y-1.5">
            {sortByDate(dates).map((mention, index) => (
              <li key={`${index}-${mention.date}`}>
                <time dateTime={mention.date} className="font-semibold whitespace-nowrap">
                  {formatIsoDate(mention.date)}
                </time>{' '}
                — {mention.context}
              </li>
            ))}
          </ol>
        )}
      </Block>
    </section>
  )
}

/**
 * Two saved analyses side by side, straight from history: no request, no AI, and no
 * computed differences. Columns stack on narrow screens.
 */
export function ComparisonView({ entries, onClose }: ComparisonViewProps) {
  const [first, second] = entries
  const headingId = useId()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  // Opening replaces the status area: take focus to it, as a new result does.
  useEffect(() => {
    focusAndReveal(headingRef.current, sectionRef.current)
  }, [first, second])

  return (
    <section
      ref={sectionRef}
      aria-labelledby={headingId}
      className="scroll-mt-4 rounded-lg border border-rule bg-sheet p-6 shadow-[0_1px_0_rgb(27_34_51/0.04),0_16px_40px_-24px_rgb(27_34_51/0.35)] motion-safe:animate-result-enter sm:p-8"
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2
            ref={headingRef}
            id={headingId}
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight"
          >
            Porównanie analiz
          </h2>
          <p className="mt-1 max-w-prose text-sm text-ink-muted">
            Zapisane wyniki obok siebie, bez ponownej analizy i bez wysyłania czegokolwiek.
          </p>
        </div>
        <button type="button" onClick={onClose} className={secondaryButton}>
          Zamknij porównanie
        </button>
      </div>

      <div className="mt-6 grid gap-8 md:grid-cols-2 md:gap-x-8 md:gap-y-5">
        <Column entry={first} label="Analiza 1" />
        <Column entry={second} label="Analiza 2" />
      </div>
    </section>
  )
}
