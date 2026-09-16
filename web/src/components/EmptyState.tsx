import { useId } from 'react'

/** What a finished analysis contains, drawn as the blank fields of a form to be filled in. */
const RESULT_FIELDS = [
  'Streszczenie w 3–5 zdaniach',
  'Najważniejsze punkty',
  'Organizacje i osoby',
  'Kwoty wraz z walutą',
  'Daty i terminy',
  'Słowa kluczowe',
]

export function EmptyState() {
  const headingId = useId()

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-lg border-2 border-dashed border-ink/15 p-6 sm:p-8"
    >
      <h2 id={headingId} className="text-lg font-semibold">
        Tu pojawi się wynik analizy
      </h2>
      <p className="mt-2 max-w-prose text-ink-muted">
        Obsługiwane są faktury, umowy, oferty, raporty i inne dokumenty PDF z zaznaczalnym tekstem.
      </p>

      <ul className="mt-8 grid gap-x-10 gap-y-4 sm:grid-cols-2">
        {RESULT_FIELDS.map((field) => (
          <li key={field} className="border-b border-ink/15 pb-2 text-ink-muted">
            {field}
          </li>
        ))}
      </ul>
    </section>
  )
}
