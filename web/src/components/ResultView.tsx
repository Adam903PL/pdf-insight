import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { downloadMarkdown } from '@/lib/downloadMarkdown'
import { downloadJson, serializeResult } from '@/lib/exportJson'
import { focusAndReveal } from '@/lib/focus'
import {
  DOCUMENT_TYPE_LABELS,
  formatAmount,
  formatIsoDate,
  formatPages,
  formatTimestamp,
  languageName,
  sortByDate,
} from '@/lib/format'
import {
  NOT_FOUND,
  RESULT_SECTIONS,
  SECTION_TITLES,
  sectionText,
  type ResultSectionId,
} from '@/lib/resultSections'
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

const SECTION_COPY_MESSAGES: Record<CopyStatus, string> = {
  idle: '',
  copied: 'Skopiowano do schowka.',
  failed: 'Nie udało się skopiować. Zaznacz treść sekcji i skopiuj ją ręcznie.',
}

type DownloadStatus = 'idle' | 'downloaded' | 'failed'

const MARKDOWN_MESSAGES: Record<DownloadStatus, string> = {
  idle: '',
  downloaded: 'Pobrano plik Markdown.',
  failed: 'Nie udało się przygotować pliku Markdown. Wynik nadal możesz pobrać jako JSON.',
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

/**
 * A small, one-off flourish for an analysis finished just now. It pops in once (never
 * loops) and is simply static when the viewer limits motion.
 */
function SuccessAccent() {
  return (
    <p className="flex items-center gap-1.5 text-sm font-semibold text-stamp">
      <svg
        viewBox="0 0 20 20"
        className="size-4 shrink-0 motion-safe:animate-stamp"
        aria-hidden="true"
      >
        <path
          d="M10 1.5l1.9 5.2 5.6 1.3-4.4 3.6 1.3 5.9L10 14.6l-4.4 2.9 1.3-5.9-4.4-3.6 5.6-1.3z"
          fill="currentColor"
        />
      </svg>
      Gotowe. Papierologia w ryzach.
    </p>
  )
}

/**
 * Links to each section. A collapsed list on phones; on wide screens it also sticks to
 * the top while the long card scrolls past.
 */
function SectionNav() {
  return (
    <details className="group border-b border-rule bg-sheet px-6 sm:px-8 lg:sticky lg:top-0 lg:z-10">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
        Nawigacja po wyniku
        <svg
          viewBox="0 0 16 16"
          className="size-4 shrink-0 text-ink-muted transition-transform group-open:rotate-180 motion-reduce:transition-none"
          aria-hidden="true"
        >
          <path
            d="M4 6l4 4 4-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <nav aria-label="Sekcje wyniku" className="pb-2">
        <ul className="flex flex-col sm:flex-row sm:flex-wrap sm:gap-x-5">
          {RESULT_SECTIONS.map(({ id, title }) => (
            <li key={id}>
              <a
                href={`#${id}`}
                className="inline-flex min-h-11 items-center text-sm text-ink-muted underline decoration-ink/30 underline-offset-4 hover:text-ink hover:decoration-ink"
              >
                {title}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </details>
  )
}

type SectionProps = {
  id: ResultSectionId
  copyStatus: CopyStatus
  onCopy: () => void
  children: ReactNode
}

function Section({ id, copyStatus, onCopy, children }: SectionProps) {
  const headingId = useId()
  const title = SECTION_TITLES[id]
  return (
    // The larger wide-screen margin keeps a jumped-to heading clear of the sticky nav.
    <section
      id={id}
      aria-labelledby={headingId}
      className="scroll-mt-4 px-6 py-6 sm:px-8 lg:scroll-mt-28"
    >
      <div className="flex items-center justify-between gap-4">
        <h3 id={headingId} className="font-semibold">
          {title}
        </h3>
        <button
          type="button"
          onClick={onCopy}
          className="-my-2.5 -mr-3 inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-stamp transition-colors hover:bg-stamp-soft"
        >
          <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
            <rect
              x="5.5"
              y="5.5"
              width="8"
              height="8"
              rx="1.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
            <path
              d="M10.5 3.5v-.5A1.5 1.5 0 0 0 9 1.5H4A1.5 1.5 0 0 0 2.5 3v5A1.5 1.5 0 0 0 4 9.5h.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
          Kopiuj<span className="sr-only"> sekcję {title}</span>
        </button>
      </div>
      <p
        aria-live="polite"
        className={`text-sm ${copyStatus === 'failed' ? 'text-alert' : 'text-ink-muted'} ${copyStatus === 'idle' ? '' : 'mt-1'}`}
      >
        {SECTION_COPY_MESSAGES[copyStatus]}
      </p>
      <div className="mt-3">{children}</div>
    </section>
  )
}

function NotFound() {
  return <p className="text-ink-muted">{NOT_FOUND}</p>
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
  const cardRef = useRef<HTMLElement>(null)
  // Feedback remembers which result it belongs to, so it clears itself when a different
  // result is shown — derived during render, no effect needed.
  const [copied, setCopied] = useState<{ result: AnalysisResult; status: CopyStatus } | null>(null)
  const copyStatus: CopyStatus = copied?.result === result ? copied.status : 'idle'
  // One section at a time shows copy feedback: the one copied last.
  const [sectionCopy, setSectionCopy] = useState<{
    result: AnalysisResult
    sectionId: ResultSectionId
    status: CopyStatus
  } | null>(null)
  const [markdownDownload, setMarkdownDownload] = useState<{
    result: AnalysisResult
    status: DownloadStatus
  } | null>(null)
  const markdownStatus: DownloadStatus =
    markdownDownload?.result === result ? markdownDownload.status : 'idle'
  const json = serializeResult(result)

  // A new result replaces the status area: take keyboard and screen-reader focus to it.
  useEffect(() => {
    focusAndReveal(titleRef.current, cardRef.current)
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

  const copySection = async (sectionId: ResultSectionId): Promise<void> => {
    try {
      await navigator.clipboard.writeText(sectionText(result, sectionId))
      setSectionCopy({ result, sectionId, status: 'copied' })
    } catch {
      // Same as the JSON copy: report the denial and leave the text there to select.
      setSectionCopy({ result, sectionId, status: 'failed' })
    }
  }

  const sectionProps = (id: ResultSectionId) => ({
    id,
    copyStatus:
      sectionCopy?.result === result && sectionCopy.sectionId === id
        ? sectionCopy.status
        : ('idle' as const),
    onCopy: () => void copySection(id),
  })

  const saveMarkdown = (): void => {
    setMarkdownDownload({ result, status: downloadMarkdown(result) ? 'downloaded' : 'failed' })
  }

  return (
    <article
      ref={cardRef}
      aria-labelledby={titleId}
      className="scroll-mt-4 rounded-lg border border-rule bg-sheet shadow-[0_1px_0_rgb(27_34_51/0.04),0_16px_40px_-24px_rgb(27_34_51/0.35)] motion-safe:animate-result-enter"
    >
      <header className="border-b border-rule px-6 pt-6 pb-6 sm:px-8 sm:pt-8">
        <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between sm:gap-4">
          <div className="min-w-0">
            {savedAt === null && <SuccessAccent />}
            <p className={`text-sm break-words text-ink-muted ${savedAt === null ? 'mt-2' : ''}`}>
              {documentInfo.fileName}
            </p>
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
          <button type="button" onClick={saveMarkdown} className={secondaryButton}>
            Pobierz Markdown
          </button>
          <button type="button" onClick={() => void copyJson()} className={secondaryButton}>
            Kopiuj JSON
          </button>
          <div className="w-full text-sm sm:w-auto">
            <p
              aria-live="polite"
              className={copyStatus === 'failed' ? 'text-alert' : 'text-ink-muted'}
            >
              {COPY_MESSAGES[copyStatus]}
            </p>
            <p
              aria-live="polite"
              className={markdownStatus === 'failed' ? 'text-alert' : 'text-ink-muted'}
            >
              {MARKDOWN_MESSAGES[markdownStatus]}
            </p>
          </div>
        </div>
      </header>

      <SectionNav />

      <div className="divide-y divide-rule">
        <Section {...sectionProps('summary')}>
          <p className="max-w-prose font-serif text-lg leading-relaxed">{summary}</p>
        </Section>

        <Section {...sectionProps('key-points')}>
          <ul className="max-w-prose list-disc space-y-2 pl-5 font-serif text-[1.0625rem] leading-relaxed marker:text-stamp">
            {keyPoints.map((point, index) => (
              <li key={`${index}-${point}`}>{point}</li>
            ))}
          </ul>
        </Section>

        <Section {...sectionProps('entities')}>
          <div className="grid gap-5 sm:grid-cols-2">
            <NameList label="Organizacje" names={entities.organizations} />
            <NameList label="Osoby" names={entities.people} />
          </div>
        </Section>

        <Section {...sectionProps('amounts')}>
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
                    <td className="py-2 pr-4 text-right align-top font-semibold whitespace-nowrap">
                      {formatAmount(amount.value, amount.currency)}
                    </td>
                    <td className="py-2 align-top">{amount.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        <Section {...sectionProps('dates')}>
          {dates.length === 0 ? (
            <NotFound />
          ) : (
            <ol className="space-y-3">
              {sortByDate(dates).map((mention, index) => (
                <li
                  key={`${index}-${mention.date}`}
                  className="grid gap-0.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4"
                >
                  <time dateTime={mention.date} className="font-semibold">
                    {formatIsoDate(mention.date)}
                  </time>
                  <span>{mention.context}</span>
                </li>
              ))}
            </ol>
          )}
        </Section>

        <Section {...sectionProps('keywords')}>
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
