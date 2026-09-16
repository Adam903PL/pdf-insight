import { useEffect, useRef } from 'react'
import { primaryButton, secondaryButton } from './styles'

export type ErrorStateProps = {
  /** User-facing Polish explanation of what went wrong and what to do. */
  message: string
  fileName: string | null
  /** Present only when sending the same file again could succeed. */
  onRetry?: () => void
  onChooseFile: () => void
}

export function ErrorState({ message, fileName, onRetry, onChooseFile }: ErrorStateProps) {
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move focus here so keyboard and screen-reader users land next to the actions.
  useEffect(() => {
    headingRef.current?.focus()
  }, [message])

  return (
    <section role="alert" className="rounded-lg border border-alert/35 bg-alert-soft p-6 sm:p-8">
      <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-alert">
        Nie udało się przeanalizować dokumentu
      </h2>
      {fileName !== null && (
        <p className="mt-1 text-sm break-words text-ink-muted">Plik: {fileName}</p>
      )}
      <p className="mt-4 max-w-prose">{message}</p>

      <div className="mt-6 flex flex-wrap gap-3">
        {onRetry && (
          <button type="button" onClick={onRetry} className={primaryButton}>
            Spróbuj ponownie
          </button>
        )}
        <button
          type="button"
          onClick={onChooseFile}
          className={onRetry ? secondaryButton : primaryButton}
        >
          Wybierz inny plik
        </button>
      </div>
    </section>
  )
}
