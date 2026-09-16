import { describe, expect, it } from 'vitest'
import { appReducer, INITIAL_STATE, isBusy, type AppAction, type AppState } from './appState'
import type { AnalysisResult } from './schema'

const result: AnalysisResult = {
  document: {
    fileName: 'umowa.pdf',
    pages: 2,
    language: 'pl',
    type: 'umowa',
    title: 'Umowa',
    date: null,
  },
  summary: 'Umowa. Zakres. Termin.',
  keyPoints: ['a', 'b', 'c'],
  entities: { organizations: [], people: [] },
  amounts: [],
  dates: [],
  keywords: [],
}

const file = new File(['%PDF-1.7'], 'umowa.pdf', { type: 'application/pdf' })

function run(state: AppState, ...actions: AppAction[]): AppState {
  return actions.reduce(appReducer, state)
}

describe('appReducer', () => {
  it('walks the happy path idle → extracting → analyzing → success', () => {
    const extracting = run(INITIAL_STATE, { type: 'EXTRACTION_STARTED', fileName: 'umowa.pdf' })
    expect(extracting).toEqual({ status: 'extracting', fileName: 'umowa.pdf' })

    const analyzing = appReducer(extracting, { type: 'ANALYSIS_STARTED', pages: 2 })
    expect(analyzing).toEqual({ status: 'analyzing', fileName: 'umowa.pdf', pages: 2 })

    expect(appReducer(analyzing, { type: 'ANALYSIS_SUCCEEDED', result })).toEqual({
      status: 'success',
      result,
    })
  })

  it('keeps the file for a retry when a failure is retryable', () => {
    const state = run(
      INITIAL_STATE,
      { type: 'EXTRACTION_STARTED', fileName: 'umowa.pdf' },
      { type: 'ANALYSIS_STARTED', pages: 2 },
      { type: 'FAILED', message: 'Brak połączenia.', fileName: 'umowa.pdf', retryFile: file },
    )

    expect(state).toEqual({
      status: 'error',
      message: 'Brak połączenia.',
      fileName: 'umowa.pdf',
      retryFile: file,
    })
  })

  it('accepts a failure before extraction starts (file rejected up front)', () => {
    const state = appReducer(INITIAL_STATE, {
      type: 'FAILED',
      message: 'To nie jest plik PDF.',
      fileName: 'notatki.txt',
      retryFile: null,
    })

    expect(state).toMatchObject({ status: 'error', retryFile: null })
  })

  it.each<AppState>([
    { status: 'success', result },
    { status: 'error', message: 'x', fileName: null, retryFile: null },
  ])('starts a new analysis from $status', (state) => {
    expect(appReducer(state, { type: 'EXTRACTION_STARTED', fileName: 'nowy.pdf' })).toEqual({
      status: 'extracting',
      fileName: 'nowy.pdf',
    })
  })

  it('resets to idle when not busy', () => {
    expect(appReducer({ status: 'success', result }, { type: 'RESET' })).toBe(INITIAL_STATE)
  })

  it.each<[AppState, AppAction]>([
    [
      { status: 'extracting', fileName: 'a.pdf' },
      { type: 'EXTRACTION_STARTED', fileName: 'b.pdf' },
    ],
    [INITIAL_STATE, { type: 'ANALYSIS_STARTED', pages: 1 }],
    [
      { status: 'extracting', fileName: 'a.pdf' },
      { type: 'ANALYSIS_SUCCEEDED', result },
    ],
    [{ status: 'analyzing', fileName: 'a.pdf', pages: 1 }, { type: 'RESET' }],
  ])('throws on an impossible transition from %o', (state, action) => {
    expect(() => appReducer(state, action)).toThrow('Invalid app state transition')
  })
})

describe('isBusy', () => {
  it('is true only while a document is being processed', () => {
    expect(isBusy({ status: 'extracting', fileName: 'a.pdf' })).toBe(true)
    expect(isBusy({ status: 'analyzing', fileName: 'a.pdf', pages: 1 })).toBe(true)
    expect(isBusy(INITIAL_STATE)).toBe(false)
    expect(isBusy({ status: 'success', result })).toBe(false)
  })
})
