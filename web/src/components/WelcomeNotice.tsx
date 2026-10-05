import { useEffect, useRef } from 'react'
import { dismissWelcomeNotice, shouldShowWelcomeNotice } from '@/lib/welcomeNotice'
import { primaryButton } from './styles'

/**
 * First-visit note for reviewers about the AI fallback. A native modal <dialog>
 * traps focus, closes on Esc, and the form's method="dialog" closes it without JS.
 */
export function WelcomeNotice() {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog !== null && !dialog.open && shouldShowWelcomeNotice()) {
      dialog.showModal()
    }
  }, [])

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="welcome-notice-title"
      onClose={() => dismissWelcomeNotice()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-lg border border-rule bg-sheet p-6 text-center text-ink shadow-xl backdrop:bg-ink/50 sm:p-8"
    >
      <p aria-hidden="true" className="text-7xl leading-none motion-safe:animate-stamp">
        🙏
      </p>
      <h2 id="welcome-notice-title" className="mt-4 text-xl font-semibold">
        Dzień dobry!
      </h2>
      <p className="mt-3 text-ink-muted">
        Analizę wykonuje dwóch niezależnych dostawców AI: najpierw Google Gemini, a gdy nie odpowie
        albo skończą mu się tokeny — zapasowy model przez OpenRouter. Mam nadzieję, że dzięki temu
        nie zobaczą Państwo nagle komunikatu o wyczerpanym limicie tokenów.
      </p>
      <form method="dialog" className="mt-6">
        <button type="submit" className={primaryButton}>
          Rozumiem, przejdź do aplikacji
        </button>
      </form>
    </dialog>
  )
}
