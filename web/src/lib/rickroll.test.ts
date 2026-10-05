import { describe, expect, it } from 'vitest'
import { claimRickroll, RICKROLL_STORAGE_KEY, type RickrollStorage } from './rickroll'

function memoryStorage(): RickrollStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

describe('claimRickroll', () => {
  it('fires on the first click and remembers it', () => {
    const storage = memoryStorage()

    expect(claimRickroll(storage)).toBe(true)
    expect(storage.data.has(RICKROLL_STORAGE_KEY)).toBe(true)
  })

  it('never fires a second time in the same browser', () => {
    const storage = memoryStorage()
    claimRickroll(storage)

    expect(claimRickroll(storage)).toBe(false)
    expect(claimRickroll(storage)).toBe(false)
  })

  it('never fires when the browser cannot remember it', () => {
    expect(claimRickroll(null)).toBe(false)
  })

  it('does not fire when storage is full, instead of breaking the button', () => {
    const storage: RickrollStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
    }

    expect(claimRickroll(storage)).toBe(false)
  })
})
