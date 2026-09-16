import type { AnalysisResult } from './schema'

/*
 * The whole analysis flow as one reducer:
 *
 *   idle | success | error  →  extracting  →  analyzing  →  success
 *   any state               →  error        (a file can be rejected before extraction)
 *   idle | success | error  →  idle         (reset)
 *
 * Transitions the UI cannot produce (a result arriving while nothing is being
 * analysed, a second upload while busy) throw: they would mean a bug, and a silently
 * ignored action is harder to find than a loud one.
 */

export type AppState =
  | { status: 'idle' }
  | { status: 'extracting'; fileName: string }
  | { status: 'analyzing'; fileName: string; pages: number }
  | { status: 'success'; result: AnalysisResult }
  | {
      status: 'error'
      message: string
      fileName: string | null
      /** The file to send again, or null when retrying the same input cannot help. */
      retryFile: File | null
    }

export type AppAction =
  | { type: 'EXTRACTION_STARTED'; fileName: string }
  | { type: 'ANALYSIS_STARTED'; pages: number }
  | { type: 'ANALYSIS_SUCCEEDED'; result: AnalysisResult }
  | { type: 'FAILED'; message: string; fileName: string | null; retryFile: File | null }
  | { type: 'RESET' }

export const INITIAL_STATE: AppState = { status: 'idle' }

export function isBusy(state: AppState): boolean {
  return state.status === 'extracting' || state.status === 'analyzing'
}

function invalidTransition(state: AppState, action: AppAction): Error {
  return new Error(`Invalid app state transition: ${action.type} while ${state.status}`)
}

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'EXTRACTION_STARTED':
      if (isBusy(state)) throw invalidTransition(state, action)
      return { status: 'extracting', fileName: action.fileName }

    case 'ANALYSIS_STARTED':
      if (state.status !== 'extracting') throw invalidTransition(state, action)
      return { status: 'analyzing', fileName: state.fileName, pages: action.pages }

    case 'ANALYSIS_SUCCEEDED':
      if (state.status !== 'analyzing') throw invalidTransition(state, action)
      return { status: 'success', result: action.result }

    // Allowed from any state: a file can be rejected before extraction even starts.
    case 'FAILED':
      return {
        status: 'error',
        message: action.message,
        fileName: action.fileName,
        retryFile: action.retryFile,
      }

    case 'RESET':
      if (isBusy(state)) throw invalidTransition(state, action)
      return INITIAL_STATE
  }
}
