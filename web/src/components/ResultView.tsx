import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { downloadJson, serializeResult } from '@/lib/exportJson'
import {
  DOCUMENT_TYPE_LABELS,
  formatAmount,
  formatIsoDate,
  formatPages,
  formatTimestamp,
  languageName,
  sortByDate,
} from '@/lib/format'
import type { AnalysisResult, DocumentType } from '@/lib/schema'
import { JsonPreview } from './JsonPreview'
import { primaryButton, secondaryButton } from './styles'

export type ResultViewProps = {
  result: AnalysisResult
  /** When the result was reopened from history: the moment it was originally saved. */
  savedAt: string | null
}

type CopyStatus = 'idle' | 'copied' | 'failed'

const COPY_MESSAGES: Record<CopyStatus, string> = {
  idle: '',
  copied: 'Skopiowano JSON do schowka.',
  failed: 'Nie udało się skopiować. Rozwiń podgląd JSON i skopiuj tekst ręcznie.',
}

/** The document type as an ink stamp — the one loud element on the card. */
function TypeStamp({ type }: { type: DocumentType }) {
  return (
    <p className="shrink-0 -rotate-4 rounded-md border-[3px] border-double border-stamp px-3 py-1 text-lg font-bold tracking-[0.14em] text-stamp uppercase motion-safe:animate-stamp">
      <span className="sr-only">Rodzaj dokumentu: </span>
      {DOCUMENT_TYPE_LABELS[type]}
    </p>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId()
  return (
    <section aria-labelledby={headingId} className="px-6 py-6 sm:px-8">
      <h3 id={headingId} className="font-semibold">
        {title}
      </h3>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function NotFound() {
  return <p className="text-ink-muted">Nie znaleziono w dokumencie.</p>
}

function NameList({ label, names }: { label: string; names: string[] }) {
  return (
    <div>
      <h4 className="text-sm text-ink-muted">{label}</h4>
      {names.length === 0 ? (
        <p className="mt-1 text-ink-muted">Brak</p>
      ) : (
        <ul className="mt-1 space-y-1">
          {names.map((name, index) => (
            <li key={`${index}-${name}`}>{name}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ResultView({ result, savedAt }: ResultViewProps) {
  const { document: documentInfo, summary, keyPoints, entities, amounts, dates, keywords } = result
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  // Remembers which result the copy feedback belongs to, so it clears itself when a
  // different result is shown — derived during render, no effect needed.
  const [copied, setCopied] = useState<{ result: AnalysisResult; status: CopyStatus } | null>(null)
  const copyStatus: CopyStatus = copied?.result === result ? copied.status : 'idle'
  const json = serializeResult(result)

  // A new result replaces the status area: take keyboard and screen-reader focus to it.
  useEffect(() => {
    titleRef.current?.focus()
  }, [result])

  const copyJson = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied({ result, status: 'copied' })
    } catch {
      // Clipboard access can be denied by the browser or its permissions; say so and
      // point at the manual route instead of failing silently.
      setCopied({ result, status: 'failed' })
    }
  }

  return (
    <article
      aria-labelledby={titleId}
      className="rounded-lg border border-rule bg-sheet shadow-[0_1px_0_rgb(27_34_51/0.04),0_16px_40px_-24px_rgb(27_34_51/0.35)]"
    >
      <header className="border-b border-rule px-6 pt-6 pb-6 sm:px-8 sm:pt-8">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm break-words text-ink-muted">{documentInfo.fileName}</p>
            <h2
              ref={titleRef}
              id={titleId}
              tabIndex={-1}
              className="mt-1 text-2xl font-bold tracking-tight text-balance break-words sm:text-3xl"
            >
              {documentInfo.title}
            </h2>
          </div>
          <TypeStamp type={documentInfo.type} />
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-ink-muted">Data dokumentu</dt>
            <dd className="mt-0.5 font-medium">
              {documentInfo.date === null ? (
                <span className="text-ink-muted">Brak daty</span>
              ) : (
                <time dateTime={documentInfo.date}>{formatIsoDate(documentInfo.date)}</time>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Objętość</dt>
            <dd className="mt-0.5 font-medium">{formatPages(documentInfo.pages)}</dd>
          </div>
          <div>
            <dt className="text-sm text-ink-muted">Język</dt>
            <dd className="mt-0.5 font-medium">{languageName(documentInfo.language)}</dd>
          </div>
        </dl>

        {savedAt !== null && (
          <p className="mt-5 text-sm text-ink-muted">
            Zapisana analiza z {formatTimestamp(savedAt)}. Aby przeanalizować dokument ponownie,
            wgraj go jeszcze raz.
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => downloadJson(result)} className={primaryButton}>
            Pobierz JSON
          </button>
          <button type="button" onClick={() => void copyJson()} className={secondaryButton}>
            Kopiuj JSON
          </button>
          <p
            aria-live="polite"
            className={`w-full text-sm sm:w-auto ${copyStatus === 'failed' ? 'text-alert' : 'text-ink-muted'}`}
          >
            {COPY_MESSAGES[copyStatus]}
          </p>
        </div>
      </header>

      <div className="divide-y divide-rule">
        <Section title="Streszczenie">
          <p className="max-w-prose font-serif text-lg leading-relaxed">{summary}</p>
        </Section>

        <Section title="Najważniejsze punkty">
          <ul className="max-w-prose list-disc space-y-2 pl-5 font-serif text-[1.0625rem] leading-relaxed marker:text-stamp">
            {keyPoints.map((point, index) => (
              <li key={`${index}-${point}`}>{point}</li>
            ))}
          </ul>
        </Section>

        <Section title="Organizacje i osoby">
          <div className="grid gap-5 sm:grid-cols-2">
            <NameList label="Organizacje" names={entities.organizations} />
            <NameList label="Osoby" names={entities.people} />
          </div>
        </Section>

        <Section title="Kwoty">
          {amounts.length === 0 ? (
            <NotFound />
          ) : (
            <table className="w-full text-left">
              <caption className="sr-only">Kwoty wymienione w dokumencie</caption>
              <thead>
                <tr className="border-b border-rule text-sm text-ink-muted">
                  <th scope="col" className="pr-4 pb-2 text-right font-normal">
                    Kwota
                  </th>
                  <th scope="col" className="pb-2 font-normal">
                    Czego dotyczy
                  </th>
                </tr>
              </thead>
              <tbody>
                {amounts.map((amount, index) => (
                  <tr key={index} className="border-b border-rule/70 last:border-b-0">
                    <td className="py-2 pr-4 text-right align-top font-semibold whitespace-nowrap tabular-nums">
                      {formatAmount(amount.value, amount.currency)}
                    </td>
                    <td className="py-2 align-top">{amount.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section title="Daty">
          {dates.length === 0 ? (
            <NotFound />
          ) : (
            <ol className="space-y-3">
              {sortByDate(dates).map((mention, index) => (
                <li
                  key={`${index}-${mention.date}`}
                  className="grid gap-0.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
                >
                  <time dateTime={mention.date} className="font-semibold tabular-nums">
                    {formatIsoDate(mention.date)}
                  </time>
                  <span>{mention.context}</span>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section title="Słowa kluczowe">
          {keywords.length === 0 ? (
            <NotFound />
          ) : (
            <ul className="flex flex-wrap gap-2">
              {keywords.map((keyword, index) => (
                <li
                  key={`${index}-${keyword}`}
                  className="rounded-full border border-stamp/25 bg-stamp-soft px-3 py-1 text-sm text-stamp"
                >
                  {keyword}
                </li>
              ))}
            </ul>
          )}
        </Section>

        <div className="px-6 py-4 sm:px-8">
          <JsonPreview json={json} />
        </div>
      </div>
    </article>
  )
}
