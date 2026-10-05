export const WELCOME_NOTICE_STORAGE_KEY = 'pdf-insight:welcome-notice-dismissed'

export type NoticeStorage = Pick<Storage, 'getItem' | 'setItem'>

/** Reading `window.localStorage` itself throws when site data is blocked. */
function browserStorage(): NoticeStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * Shown until the visitor closes it once. Without storage it shows on every visit:
 * repeating a one-paragraph notice is better than never showing it.
 */
export function shouldShowWelcomeNotice(storage: NoticeStorage | null = browserStorage()): boolean {
  return storage === null || storage.getItem(WELCOME_NOTICE_STORAGE_KEY) === null
}

export function dismissWelcomeNotice(storage: NoticeStorage | null = browserStorage()): void {
  storage?.setItem(WELCOME_NOTICE_STORAGE_KEY, new Date().toISOString())
}
