import { useReducer } from 'react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { FileDropzone } from '@/components/FileDropzone'
import { HistoryPanel } from '@/components/HistoryPanel'
import { LoadingState } from '@/components/LoadingState'
import { ResultView } from '@/components/ResultView'
import type { HistoryEntry } from '@/lib/history'
import type { AnalysisResult } from '@/lib/schema'

type AppState =
  | { status: 'idle' }
  | { status: 'extracting'; fileName: string }
  | { status: 'analyzing'; fileName: string; pages: number }
  | { status: 'success'; result: AnalysisResult }
  | { status: 'error'; message: string }

type AppAction =
  | { type: 'EXTRACTION_STARTED'; fileName: string }
  | { type: 'ANALYSIS_STARTED'; pages: number }
  | { type: 'ANALYSIS_SUCCEEDED'; result: AnalysisResult }
  | { type: 'FAILED'; message: string }
  | { type: 'RESET' }

const INITIAL_STATE: AppState = { status: 'idle' }

function appReducer(_state: AppState, _action: AppAction): AppState {
  // TODO: transitions idle → extracting → analyzing → success | error (+ RESET).
  throw new Error('Not implemented')
}

export function App() {
  const [state] = useReducer(appReducer, INITIAL_STATE)
  // TODO: initialise from loadHistory().
  const history: HistoryEntry[] = []
  const isBusy = state.status === 'extracting' || state.status === 'analyzing'

  const handleFileSelected = (_file: File): void => {
    // TODO: extractText → analyze → saveHistoryEntry, dispatching AppAction at each step.
    throw new Error('Not implemented')
  }

  const handleHistorySelect = (_entry: HistoryEntry): void => {
    // TODO: show a saved result without re-analysing.
    throw new Error('Not implemented')
  }

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold">PDF Insight</h1>
      <FileDropzone onFileSelected={handleFileSelected} disabled={isBusy} />
      <StatusView state={state} />
      <HistoryPanel entries={history} onSelect={handleHistorySelect} />
    </main>
  )
}

function StatusView({ state }: { state: AppState }) {
  switch (state.status) {
    case 'idle':
      return <EmptyState />
    case 'extracting':
    case 'analyzing':
      return <LoadingState stage={state.status} />
    case 'success':
      return <ResultView result={state.result} />
    case 'error':
      return <ErrorState message={state.message} />
  }
}
