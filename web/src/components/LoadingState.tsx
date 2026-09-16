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

/** The two real steps of the pipeline, in order, with the one in progress marked. */
export function LoadingState({ stage, fileName, pages }: LoadingStateProps) {
  const extracted = stage === 'analyzing'

  return (
    <section role="status" className="rounded-lg border border-rule bg-sheet p-6 sm:p-8">
      <h2 className="text-lg font-semibold">Trwa analiza dokumentu</h2>
      <p className="mt-1 text-sm break-words text-ink-muted">Plik: {fileName}</p>

      <ol className="mt-6 space-y-5">
        <Step
          number={1}
          status={extracted ? 'done' : 'active'}
          label="Odczyt tekstu z PDF"
          detail={
            extracted && pages !== null
              ? `Odczytano tekst z ${pages} str.`
              : 'Tekst jest odczytywany w przeglądarce, plik nigdzie nie jest wysyłany.'
          }
        />
        <Step
          number={2}
          status={extracted ? 'active' : 'pending'}
          label="Analiza treści przez AI"
          detail={extracted ? 'Zwykle trwa to od 5 do 15 sekund.' : null}
        />
      </ol>
    </section>
  )
}
