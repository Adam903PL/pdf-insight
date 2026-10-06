import { markdownFileName, resultToMarkdown } from './markdown'
import type { AnalysisResult } from './schema'

/**
 * Saves the result as a .md file through a temporary object URL. Returns false when the
 * browser refuses to set the download up, so the caller can say so and point at JSON.
 * Formatting runs outside the guard: a formatting error is a bug and must stay loud.
 */
export function downloadMarkdown(result: AnalysisResult): boolean {
  const markdown = resultToMarkdown(result)
  let url: string | null = null
  let link: HTMLAnchorElement | null = null

  try {
    url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }))
    link = document.createElement('a')
    link.href = url
    link.download = markdownFileName(result.document.fileName)
    document.body.append(link)
    link.click()
    return true
  } catch {
    return false
  } finally {
    link?.remove()
    // Some browsers start the download asynchronously; revoke only after this tick.
    const createdUrl = url
    if (createdUrl !== null) setTimeout(() => URL.revokeObjectURL(createdUrl), 0)
  }
}
