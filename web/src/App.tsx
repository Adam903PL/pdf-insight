import { useReducer, useRef, useState } from 'react'
import { analyze, ApiError } from '@/api/analyze'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { FileDropzone } from '@/components/FileDropzone'
import { HistoryPanel } from '@/components/HistoryPanel'
import { LoadingState } from '@/components/LoadingState'
import { ResultView } from '@/components/ResultView'
import { appReducer, INITIAL_STATE, isBusy, type AppState } from '@/lib/appState'
import { validateSelection } from '@/lib/fileValidation'
import {
  addHistoryEntry,
  clearHistory,
  createHistoryEntry,
  loadHistory,
  type HistoryEntry,
  type HistoryState,
} from '@/lib/history'

type PdfModule = typeof import('@/lib/pdf')

// pdf.js is most of the bundle, so it is fetched only once someone actually picks a file.
const loadPdfModule = (): Promise<PdfModule> => import('@/lib/pdf')

const UNEXPECTED_ERROR =
  'Wystąpił nieoczekiwany błąd. Spróbuj ponownie, a jeśli problem się powtórzy, odśwież stronę.'
const PDF_READER_UNAVAILABLE =
  'Nie udało się wczytać czytnika PDF. Sprawdź połączenie z internetem i spróbuj ponownie.'

export function App() {
  const [state, dispatch] = useReducer(appReducer, INITIAL_STATE)
  const [history, setHistory] = useState<HistoryState>(() => loadHistory())
  const fileInputRef = useRef<HTMLInputElement>(null)
  const busy = isBusy(state)

  async function analyzeFile(file: File): Promise<void> {
    dispatch({ type: 'EXTRACTION_STARTED', fileName: file.name })

    let pdf: PdfModule
    try {
      pdf = await loadPdfModule()
    } catch {
      // The chunk could not be downloaded (offline, or a redeploy replaced the hashed file).
      dispatch({
        type: 'FAILED',
        message: PDF_READER_UNAVAILABLE,
        fileName: file.name,
        retryFile: file,
      })
      return
    }

    let entry: HistoryEntry
    try {
      const { text, pages } = await pdf.extractText(file)
      dispatch({ type: 'ANALYSIS_STARTED', pages })

      const result = await analyze({ fileName: file.name, pages, text })
      entry = createHistoryEntry(result)
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

    dispatch({ type: 'ANALYSIS_SUCCEEDED', entry })
    // Saved after the result is on screen, so a storage failure can never replace it with
    // an error. History cannot change meanwhile: its controls are disabled while busy.
    setHistory(addHistoryEntry(history.entries, entry))
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
    <main className="mx-auto grid max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-12 lg:py-14">
      <div className="space-y-6 lg:col-start-1 lg:row-start-1">
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

      {/* Second in the DOM so on narrow screens the result follows the upload directly. */}
      <div className="min-w-0 lg:col-start-2 lg:row-span-2 lg:row-start-1">
        <StatusView state={state} onRetry={startAnalysis} onChooseFile={openFilePicker} />
      </div>

      <div className="lg:col-start-1 lg:row-start-2">
        <HistoryPanel
          entries={history.entries}
          warning={history.warning}
          activeId={state.status === 'success' ? state.entry.id : null}
          disabled={busy}
          onSelect={(entry) => dispatch({ type: 'HISTORY_ENTRY_OPENED', entry })}
          onClear={() => setHistory(clearHistory())}
        />
      </div>
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
      return (
        <ResultView
          result={state.entry.result}
          savedAt={state.fromHistory ? state.entry.createdAt : null}
        />
      )
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
