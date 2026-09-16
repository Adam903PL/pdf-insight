/** Largest PDF the upload accepts (brief F-01). */
export const MAX_FILE_BYTES = 10 * 1024 * 1024

/**
 * Longest extracted text sent for analysis. MUST equal MAX_TEXT_LENGTH in
 * server/src/schema.ts — the server rejects anything longer with 400, so checking
 * here lets the UI explain the limit before a round trip.
 */
export const MAX_TEXT_LENGTH = 200_000

/**
 * Fewer visible (non-whitespace) characters than this means the PDF has no usable
 * text layer — typically a scan or photographed pages. Too little to summarise in
 * 3–5 sentences either way.
 */
export const MIN_TEXT_CHARS = 50
