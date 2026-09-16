import type { AnalysisResult } from './schema'

/** Exactly the validated result, pretty-printed — the downloaded file matches the schema. */
export function serializeResult(result: AnalysisResult): string {
  return `${JSON.stringify(result, null, 2)}\n`
}

/**
 * `Umowa serwisowa.pdf` → `Umowa serwisowa-analiza.json`. Strips characters Windows
 * forbids in file names (plus control characters) and trailing dots or spaces.
 */
export function jsonFileName(pdfFileName: string): string {
  const base = pdfFileName
    .replace(/\.pdf$/i, '')
    .replace(/[<>:"/\\|?*\p{Cc}]/gu, '_')
    .replace(/[. ]+$/, '')
    .trim()
  return `${base === '' ? 'dokument' : base}-analiza.json`
}

/** Saves the result as a .json file through a temporary object URL. */
export function downloadJson(result: AnalysisResult): void {
  const blob = new Blob([serializeResult(result)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = jsonFileName(result.document.fileName)
  document.body.append(link)
  link.click()
  link.remove()

  // Some browsers start the download asynchronously; revoke only after this tick.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
