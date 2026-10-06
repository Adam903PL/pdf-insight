import { useEffect, useRef } from 'react'
import { focusAndReveal } from '@/lib/focus'

export type LoadingStateProps = {
  stage: 'extracting' | 'analyzing'
  fileName: string
  /** Page count, known once extraction has finished. */
  pages: number | null
}

type StepStatus = 'done' | 'active' | 'pending'

function StepMarker({ status, number }: { status: StepStatus; number: number }) {
  if (status === 'done') {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-stamp text-white">
        <svg viewBox="0 0 16 16" className="size-4" aria-hidden="true">
          <path
            d="M3.5 8.5l3 3 6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }
  if (status === 'active') {
    return (
      <span className="flex size-7 shrink-0 items-center justify-center" aria-hidden="true">
        <span className="size-6 rounded-full border-[3px] border-stamp/25 border-t-stamp motion-safe:animate-spin" />
      </span>
    )
  }
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink/25 text-sm font-semibold text-ink-muted"
      aria-hidden="true"
    >
      {number}
    </span>
  )
}

const STATUS_TEXT: Record<StepStatus, string> = {
  done: 'zakończono',
  active: 'w toku',
  pending: 'oczekuje',
}

function Step(props: { number: number; status: StepStatus; label: string; detail: string | null }) {
  const { number, status, label, detail } = props
  return (
    <li className="flex gap-4">
      <StepMarker status={status} number={number} />
      <div className="pt-0.5">
        <p className={status === 'pending' ? 'font-medium text-ink-muted' : 'font-semibold'}>
          {label}
          <span className="sr-only">, {STATUS_TEXT[status]}</span>
        </p>
        {detail !== null && <p className="mt-1 text-sm text-ink-muted">{detail}</p>}
      </div>
    </li>
  )
}

/**
 * A sheet being read, purely decorative: it shows no progress, and without motion the
 * light is simply not drawn — the steps below carry all the status information.
 */
function PaperStack() {
  return (
    <div className="relative h-14 w-11 shrink-0" aria-hidden="true">
      <div className="absolute inset-0 translate-x-1.5 -translate-y-1.5 rotate-3 rounded-sm border border-rule bg-paper" />
      <div className="absolute inset-0 overflow-hidden rounded-sm border border-ink/20 bg-sheet">
        <div className="mx-2 mt-3 space-y-1.5">
          <div className="h-0.5 rounded-full bg-ink/20" />
          <div className="h-0.5 rounded-full bg-ink/20" />
          <div className="h-0.5 w-2/3 rounded-full bg-ink/20" />
          <div className="h-0.5 rounded-full bg-ink/20" />
          <div className="h-0.5 w-1/2 rounded-full bg-ink/20" />
        </div>
        <div className="absolute inset-0 hidden bg-linear-to-r from-transparent via-stamp/25 to-transparent motion-safe:block motion-safe:animate-paper-scan" />
      </div>
    </div>
  )
}

/** The two real steps of the pipeline, in order, with the one in progress marked. */
export function LoadingState({ stage, fileName, pages }: LoadingStateProps) {
  const extracted = stage === 'analyzing'
  const headingRef = useRef<HTMLHeadingElement>(null)
  const sectionRef = useRef<HTMLElement>(null)

  // The upload button that had focus is now disabled: hand focus to the progress instead,
  // once, when processing starts (the component stays mounted across both steps).
  useEffect(() => {
    focusAndReveal(headingRef.current, sectionRef.current)
  }, [])

  return (
    <section
      ref={sectionRef}
      role="status"
      className="scroll-mt-4 rounded-lg border border-rule bg-sheet p-6 sm:p-8"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
            Trwa analiza dokumentu
          </h2>
          <p className="mt-1 text-sm break-words text-ink-muted">Plik: {fileName}</p>
        </div>
        <PaperStack />
      </div>

      <ol className="mt-6 space-y-5">
        <Step
          number={1}
          status={extracted ? 'done' : 'active'}
          label="Odczyt tekstu z PDF"
          detail={
            extracted && pages !== null
              ? `Odczytano tekst z ${pages} str.`
              : 'Czytamy tekst lokalnie — sam PDF zostaje u Ciebie.'
          }
        />
        <Step
          number={2}
          status={extracted ? 'active' : 'pending'}
          label="Analiza treści przez AI"
          detail={
            extracted
              ? 'Porządkujemy najważniejsze informacje. Zwykle trwa to od 5 do 15 sekund.'
              : null
          }
        />
      </ol>
    </section>
  )
}
