import * as pdfjs from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

// The worker is bundled by Vite and referenced by its hashed asset URL, so it resolves
// correctly under the GitHub Pages base path (/pdf-insight/) — no CDN, no default path.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

export type ExtractedText = {
  text: string
  pages: number
}

/** Extracts plain text from every page of a PDF, entirely in the browser. */
export function extractText(_file: File): Promise<ExtractedText> {
  // TODO: pdfjs.getDocument({ data: await file.arrayBuffer() }), collect getTextContent() per page,
  // handle encrypted/scanned (no text layer) PDFs explicitly.
  throw new Error('Not implemented')
}
