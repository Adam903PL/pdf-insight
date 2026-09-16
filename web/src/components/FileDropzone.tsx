import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type RefObject,
} from 'react'
import { primaryButton } from './styles'

export type FileDropzoneProps = {
  /** Every picked or dropped file; validation happens in the caller. */
  onFilesSelected: (files: File[]) => void
  disabled?: boolean
  /** Shared so actions elsewhere (e.g. "Wybierz inny plik") open the same picker. */
  inputRef: RefObject<HTMLInputElement>
}

function hasFiles(event: DragEvent): boolean {
  return Array.from(event.dataTransfer.types).includes('Files')
}

export function FileDropzone({ onFilesSelected, disabled = false, inputRef }: FileDropzoneProps) {
  const [dragging, setDragging] = useState(false)
  // dragenter/dragleave also fire for every child element; count them to avoid flicker.
  const dragDepth = useRef(0)

  // A file dropped just outside the zone would otherwise make the browser navigate away
  // to display the PDF, discarding the app.
  useEffect(() => {
    const preventNavigation = (event: globalThis.DragEvent) => event.preventDefault()
    window.addEventListener('dragover', preventNavigation)
    window.addEventListener('drop', preventNavigation)
    return () => {
      window.removeEventListener('dragover', preventNavigation)
      window.removeEventListener('drop', preventNavigation)
    }
  }, [])

  const handleDragEnter = (event: DragEvent<HTMLDivElement>) => {
    if (disabled || !hasFiles(event)) return
    dragDepth.current += 1
    setDragging(true)
  }

  const handleDragLeave = () => {
    if (dragDepth.current === 0) return
    dragDepth.current -= 1
    if (dragDepth.current === 0) setDragging(false)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = disabled ? 'none' : 'copy'
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepth.current = 0
    setDragging(false)
    if (disabled) return
    onFilesSelected(Array.from(event.dataTransfer.files))
  }

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    // Clear the input so choosing the same file again still fires a change event.
    event.target.value = ''
    if (files.length > 0) onFilesSelected(files)
  }

  const zoneState = disabled
    ? 'border-ink/15 opacity-60'
    : dragging
      ? 'border-stamp bg-stamp-soft'
      : 'border-ink/30 bg-sheet/60'

  return (
    <div className="space-y-3">
      <div
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-colors ${zoneState}`}
      >
        <svg viewBox="0 0 40 48" className="h-12 w-10 text-stamp" aria-hidden="true">
          <path
            d="M6 2h20l12 12v30a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          <path d="M26 2v12h12" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <path d="M12 26h16M12 32h16M12 38h10" stroke="currentColor" strokeWidth="2.5" />
        </svg>

        <p className="mt-4 font-semibold" aria-live="polite">
          {dragging ? 'Upuść plik, aby rozpocząć analizę' : 'Przeciągnij tutaj plik PDF'}
        </p>
        <p className="mt-1 text-sm text-ink-muted">lub</p>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className={`${primaryButton} mt-3`}
        >
          Wybierz plik PDF
        </button>
        <p className="mt-4 text-sm text-ink-muted">
          Dokument z zaznaczalnym tekstem, <span className="whitespace-nowrap">do 10 MB</span>
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          disabled={disabled}
          onChange={handleChange}
        />
      </div>

      <p className="flex gap-2 text-sm text-ink-muted">
        <svg viewBox="0 0 20 20" className="mt-0.5 size-4 shrink-0 text-stamp" aria-hidden="true">
          <circle cx="10" cy="10" r="8.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M10 9v5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
          <circle cx="10" cy="6.25" r="1.1" fill="currentColor" />
        </svg>
        <span>
          Tekst z pliku zostanie wysłany do usługi AI Google Gemini w celu analizy. Nie wgrywaj
          dokumentów z danymi poufnymi.
        </span>
      </p>
    </div>
  )
}
