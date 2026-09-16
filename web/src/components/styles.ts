/*
 * Shared button looks as class strings rather than components, so every call site
 * keeps its own element and semantics. min-h-11 keeps touch targets at 44 px.
 */

const buttonBase =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60'

export const primaryButton = `${buttonBase} bg-stamp text-white hover:bg-stamp/90`

export const secondaryButton = `${buttonBase} border border-ink/25 bg-sheet text-ink hover:border-ink/50 hover:bg-paper`
