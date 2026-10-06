import { describe, expect, it } from 'vitest'
import { pruneCompareIds, resolveComparison, toggleCompareId } from './comparison'
import type { HistoryEntry } from './history'

function entry(id: string): HistoryEntry {
  return {
    id,
    createdAt: '2026-10-06T10:00:00.000Z',
    result: {
      document: {
        fileName: `${id}.pdf`,
        pages: 1,
        language: 'pl',
        type: 'inne',
        title: id,
        date: null,
      },
      summary: 'Streszczenie.',
      keyPoints: ['a', 'b', 'c'],
      entities: { organizations: [], people: [] },
      amounts: [],
      dates: [],
      keywords: [],
    },
  }
}

describe('toggleCompareId', () => {
  it('adds an unselected id', () => {
    expect(toggleCompareId(['a'], 'b')).toEqual(['a', 'b'])
  })

  it('removes a selected id', () => {
    expect(toggleCompareId(['a', 'b'], 'a')).toEqual(['b'])
  })

  it('never selects a third analysis', () => {
    expect(toggleCompareId(['a', 'b'], 'c')).toEqual(['a', 'b'])
  })

  it('does not modify the given list', () => {
    const ids = ['a']
    toggleCompareId(ids, 'b')

    expect(ids).toEqual(['a'])
  })
})

describe('resolveComparison', () => {
  const entries = [entry('a'), entry('b'), entry('c')]

  it('returns both entries in the order they were selected', () => {
    const pair = resolveComparison(entries, ['c', 'a'])

    expect(pair?.map((item) => item.id)).toEqual(['c', 'a'])
  })

  it('is null until two analyses are selected', () => {
    expect(resolveComparison(entries, [])).toBeNull()
    expect(resolveComparison(entries, ['a'])).toBeNull()
  })

  it('is null when a selected analysis is no longer in history', () => {
    expect(resolveComparison(entries, ['a', 'gone'])).toBeNull()
  })
})

describe('pruneCompareIds', () => {
  it('drops ids whose analyses left history, keeping the order of the rest', () => {
    expect(pruneCompareIds(['b', 'gone', 'a'], [entry('a'), entry('b')])).toEqual(['b', 'a'])
  })
})
