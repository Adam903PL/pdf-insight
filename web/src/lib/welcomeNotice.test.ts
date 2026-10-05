import { describe, expect, it } from 'vitest'
import {
  dismissWelcomeNotice,
  shouldShowWelcomeNotice,
  WELCOME_NOTICE_STORAGE_KEY,
  type NoticeStorage,
} from './welcomeNotice'

function memoryStorage(): NoticeStorage & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

describe('welcome notice', () => {
  it('shows on the first visit', () => {
    expect(shouldShowWelcomeNotice(memoryStorage())).toBe(true)
  })

  it('stays hidden once dismissed', () => {
    const storage = memoryStorage()

    dismissWelcomeNotice(storage)

    expect(storage.data.has(WELCOME_NOTICE_STORAGE_KEY)).toBe(true)
    expect(shouldShowWelcomeNotice(storage)).toBe(false)
  })

  it('still shows when the browser blocks storage, and dismissing does not throw', () => {
    expect(shouldShowWelcomeNotice(null)).toBe(true)
    expect(() => dismissWelcomeNotice(null)).not.toThrow()
  })
})
