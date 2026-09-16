import { describe, expect, it } from 'vitest'
import {
  addHistoryEntry,
  clearHistory,
  createHistoryEntry,
  HISTORY_STORAGE_KEY,
  HISTORY_WARNINGS,
  loadHistory,
  MAX_HISTORY_ENTRIES,
  type HistoryEntry,
  type HistoryStorage,
} from './history'
import type { AnalysisResult } from './schema'

function result(title: string): AnalysisResult {
  return {
    document: {
      fileName: `${title}.pdf`,
      pages: 1,
      language: 'pl',
      type: 'inne',
      title,
      date: null,
    },
    summary: 'Pierwsze zdanie. Drugie zdanie. Trzecie zdanie.',
    keyPoints: ['a', 'b', 'c'],
    entities: { organizations: [], people: [] },
    amounts: [],
    dates: [],
    keywords: [],
  }
}

function entry(title: string): HistoryEntry {
  return createHistoryEntry(result(title), new Date('2026-09-16T12:00:00.000Z'))
}

function memoryStorage(initial: string | null = null) {
  const data = new Map<string, string>()
  if (initial !== null) data.set(HISTORY_STORAGE_KEY, initial)
  const storage: HistoryStorage = {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: (key) => void data.delete(key),
  }
  return { storage, raw: () => data.get(HISTORY_STORAGE_KEY) ?? null }
}

describe('loadHistory', () => {
  it('starts empty without a warning', () => {
    expect(loadHistory(memoryStorage().storage)).toEqual({ entries: [], warning: null })
  })

  it('reads back what addHistoryEntry saved, newest first', () => {
    const { storage } = memoryStorage()
    const first = addHistoryEntry([], entry('pierwszy'), storage)
    addHistoryEntry(first.entries, entry('drugi'), storage)

    const titles = loadHistory(storage).entries.map((saved) => saved.result.document.title)
    expect(titles).toEqual(['drugi', 'pierwszy'])
  })

  it('clears unparseable storage and says so', () => {
    const memory = memoryStorage('{not json')

    expect(loadHistory(memory.storage)).toEqual({
      entries: [],
      warning: HISTORY_WARNINGS.corrupted,
    })
    expect(memory.raw()).toBeNull()
  })

  it('keeps valid entries, drops invalid ones and rewrites storage', () => {
    const valid = entry('poprawny')
    const invalid = { ...entry('zepsuty'), result: { summary: 'brak reszty pól' } }
    const memory = memoryStorage(JSON.stringify([valid, invalid]))

    const loaded = loadHistory(memory.storage)

    expect(loaded).toEqual({ entries: [valid], warning: HISTORY_WARNINGS.corrupted })
    expect(JSON.parse(memory.raw() ?? 'null')).toEqual([valid])
  })

  it('treats a non-array value as corrupted', () => {
    const memory = memoryStorage(JSON.stringify({ entries: [] }))

    expect(loadHistory(memory.storage).warning).toBe(HISTORY_WARNINGS.corrupted)
    expect(memory.raw()).toBe('[]')
  })

  it('notices a damaged entry even when valid ones already fill the cap', () => {
    const stored = [
      ...Array.from({ length: MAX_HISTORY_ENTRIES + 1 }, (_, index) => entry(`ok ${index}`)),
      { id: 'zepsuty' },
    ]
    const memory = memoryStorage(JSON.stringify(stored))

    const loaded = loadHistory(memory.storage)

    expect(loaded.warning).toBe(HISTORY_WARNINGS.corrupted)
    expect(loaded.entries).toHaveLength(MAX_HISTORY_ENTRIES)
  })

  it('reports blocked storage instead of throwing', () => {
    expect(loadHistory(null)).toEqual({ entries: [], warning: HISTORY_WARNINGS.unavailable })
  })
})

describe('addHistoryEntry', () => {
  it(`keeps only the newest ${MAX_HISTORY_ENTRIES} entries`, () => {
    const { storage } = memoryStorage()
    let entries: HistoryEntry[] = []
    for (let index = 1; index <= MAX_HISTORY_ENTRIES + 2; index++) {
      entries = addHistoryEntry(entries, entry(`dokument ${index}`), storage).entries
    }

    const saved = loadHistory(storage).entries
    expect(saved).toHaveLength(MAX_HISTORY_ENTRIES)
    expect(saved[0]?.result.document.title).toBe(`dokument ${MAX_HISTORY_ENTRIES + 2}`)
  })

  it('keeps the entry for this session when the browser storage is full', () => {
    const storage: HistoryStorage = {
      ...memoryStorage().storage,
      setItem: () => {
        throw new DOMException('quota', 'QuotaExceededError')
      },
    }

    const state = addHistoryEntry([], entry('duży'), storage)

    expect(state.entries).toHaveLength(1)
    expect(state.warning).toBe(HISTORY_WARNINGS.full)
  })

  it('rethrows storage errors it does not understand', () => {
    const storage: HistoryStorage = {
      ...memoryStorage().storage,
      setItem: () => {
        throw new Error('disk on fire')
      },
    }

    expect(() => addHistoryEntry([], entry('x'), storage)).toThrow('disk on fire')
  })
})

describe('clearHistory', () => {
  it('removes everything', () => {
    const memory = memoryStorage()
    addHistoryEntry([], entry('do usunięcia'), memory.storage)

    expect(clearHistory(memory.storage)).toEqual({ entries: [], warning: null })
    expect(memory.raw()).toBeNull()
  })
})
