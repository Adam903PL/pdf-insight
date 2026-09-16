import { useReducer, useRef } from 'react'
import { analyze, ApiError } from '@/api/analyze'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { FileDropzone } from '@/components/FileDropzone'
import { LoadingState } from '@/components/LoadingState'
import { ResultView } from '@/components/ResultView'
import { appReducer, INITIAL_STATE, isBusy, type AppState } from '@/lib/appState'
import { validateSelection } from '@/lib/fileValidation'

type PdfModule = typeof import('@/lib/pdf')

// pdf.js is most of the bundle, so it is fetched only once someone actually picks a file.
const loadPdfModule = (): Promise<PdfModule> => import('@/lib/pdf')

const UNEXPECTED_ERROR =
  'Wystąpił nieoczekiwany błąd. Spróbuj ponownie, a jeśli problem się powtórzy, odśwież stronę.'
const PDF_READER_UNAVAILABLE =
  'Nie udało się wczytać czytnika PDF. Sprawdź połączenie z internetem i spróbuj ponownie.'

export function App() {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busy = isBusy(state)

  async function analyzeFile(file: File): Promise<void> {
    dispatch({ type: 'EXTRACTION_STARTED', fileName: file.name })

    let pdf: PdfModule
    try {
      pdf = await loadPdfModule()
    } catch {
      // The chunk could not be downloaded (offline, deploy swapped the hashed file).
      dispatch({
        type: 'FAILED',
        message: PDF_READER_UNAVAILABLE,
        fileName: file.name,
        retryFile: file,
      })
      return
    }

    try {
      const { text, pages } = await pdf.extractText(file)
      dispatch({ type: 'ANALYSIS_STARTED', pages })

      const result = await analyze({ fileName: file.name, pages, text })
      dispatch({ type: 'ANALYSIS_SUCCEEDED', result })
    } catch (error) {
      if (error instanceof pdf.PdfExtractionError) {
        dispatch({ type: 'FAILED', message: error.message, fileName: file.name, retryFile: null })
        return
      }
      if (error instanceof ApiError) {
        const retryFile = error.retryable ? file : null
        dispatch({ type: 'FAILED', message: error.message, fileName: file.name, retryFile })
        return
      }

      dispatch({ type: 'FAILED', message: UNEXPECTED_ERROR, fileName: file.name, retryFile: file })
      // Anything else is a bug: show a usable screen, but keep the error loud in the console.
      throw error
    }
  }

  const startAnalysis = (file: File): void => {
    void analyzeFile(file)
  }

  const handleFilesSelected = (files: File[]): void => {
    const selection = validateSelection(files)
    if (!selection.ok) {
      const { message, fileName } = selection
      dispatch({ type: 'FAILED', message, fileName, retryFile: null })
      return
    }
    startAnalysis(selection.file)
  }

  const openFilePicker = (): void => {
    fileInputRef.current?.click()
  }

  return (
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-12 lg:py-14">
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">PDF Insight</h1>
          <p className="mt-3 text-ink-muted">
            Wgraj dokument PDF, a otrzymasz jego streszczenie i najważniejsze dane. Wynik możesz
            pobrać jako plik JSON.
          </p>
        </header>
        <FileDropzone
          onFilesSelected={handleFilesSelected}
          disabled={busy}
          inputRef={fileInputRef}
        />
      </div>

      <StatusView state={state} onRetry={startAnalysis} onChooseFile={openFilePicker} />
    </main>
  )
}

type StatusViewProps = {
  state: AppState
  onRetry: (file: File) => void
  onChooseFile: () => void
}

function StatusView({ state, onRetry, onChooseFile }: StatusViewProps) {
  switch (state.status) {
    case 'idle':
      return <EmptyState />
    case 'extracting':
      return <LoadingState stage="extracting" fileName={state.fileName} pages={null} />
    case 'analyzing':
      return <LoadingState stage="analyzing" fileName={state.fileName} pages={state.pages} />
    case 'success':
      return <ResultView result={state.result} />
    case 'error': {
      const { retryFile } = state
      return (
        <ErrorState
          message={state.message}
          fileName={state.fileName}
          onRetry={retryFile ? () => onRetry(retryFile) : undefined}
          onChooseFile={onChooseFile}
        />
      )
    }
  }
}
