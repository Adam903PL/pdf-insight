export const RICKROLL_URL = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
export const RICKROLL_STORAGE_KEY = 'pdf-insight:rickrolled'

export type RickrollStorage = Pick<Storage, 'getItem' | 'setItem'>

/** Reading `window.localStorage` itself throws when site data is blocked. */
function browserStorage(): RickrollStorage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

/**
 * True exactly once per browser: the first click on "Wybierz plik PDF" opens the
 * rickroll instead of the file picker. The flag is written before returning true,
 * and without working storage it never fires — a browser that cannot remember the
 * prank must not get it on every click and lose the ability to test the app.
 */
export function claimRickroll(storage: RickrollStorage | null = browserStorage()): boolean {
  if (storage === null || storage.getItem(RICKROLL_STORAGE_KEY) !== null) {
    return false
  }
  try {
    storage.setItem(RICKROLL_STORAGE_KEY, new Date().toISOString())
  } catch (error) {
    if (error instanceof DOMException && error.name === 'QuotaExceededError') {
      return false
    }
    throw error
  }
  return true
}
