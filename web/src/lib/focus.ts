/**
 * Moves focus to a status heading and makes sure the new content is actually seen.
 *
 * `focus()` alone does not help on phones: the status area sits under the upload, and
 * a heading peeking in at the bottom edge already counts as visible, so the browser
 * does not scroll. Instead, scroll the container to the top unless it already starts
 * in the upper part of the screen (on wide layouts it is beside the upload, so nothing
 * moves).
 */
export function focusAndReveal(heading: HTMLElement | null, container: HTMLElement | null): void {
  heading?.focus({ preventScroll: true })
  if (container === null) return

  const { top } = container.getBoundingClientRect()
  if (top >= 0 && top < window.innerHeight * 0.35) return

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  container.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
}
