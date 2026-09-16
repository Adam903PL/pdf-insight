import * as pdfjs from 'pdfjs-dist'
import type { PDFDocumentLoadingTask, PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { MAX_TEXT_LENGTH, MIN_TEXT_CHARS } from './limits'

// The worker is bundled by Vite and referenced by its hashed asset URL, so it resolves
// correctly under the GitHub Pages base path (/pdf-insight/) — no CDN, no default path.
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

type TextContent = Awaited<ReturnType<PDFPageProxy['getTextContent']>>

export type ExtractedText = {
  text: string
  pages: number
}

export type PdfExtractionErrorKind = 'invalid' | 'encrypted' | 'no-text' | 'too-long'

const MESSAGES: Record<PdfExtractionErrorKind, string> = {
  invalid: 'Nie udało się odczytać pliku. Upewnij się, że to poprawny, nieuszkodzony dokument PDF.',
  encrypted: 'Ten PDF jest zabezpieczony hasłem. Usuń zabezpieczenie i wgraj plik ponownie.',
  'no-text':
    'Ten PDF nie zawiera tekstu do odczytania — to najpewniej skan lub zdjęcia stron. Aplikacja nie obsługuje OCR, wgraj dokument z zaznaczalnym tekstem.',
  'too-long': `Dokument jest za długi do analizy. Tekst może mieć maksymalnie ${MAX_TEXT_LENGTH.toLocaleString('pl-PL')} znaków.`,
}

/** A PDF that parsed (or failed to) in a way the user can act on. Messages are user-facing. */
export class PdfExtractionError extends Error {
  readonly kind: PdfExtractionErrorKind

  constructor(kind: PdfExtractionErrorKind) {
    super(MESSAGES[kind])
    this.name = 'PdfExtractionError'
    this.kind = kind
  }
}

/** Collapses runs of spaces and blank lines left behind by PDF text positioning. */
export function normalizeWhitespace(text: string): string {
  return text
    .replace(/[^\S\n]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

/** Joins one page's text items, honouring pdf.js end-of-line markers. */
export function pageText(content: Pick<TextContent, 'items'>): string {
  let text = ''
  for (const item of content.items) {
    // TextMarkedContent entries only delimit structure and carry no text.
    if (!('str' in item)) {
      continue
    }
    text += item.str
    if (item.hasEOL) {
      text += '\n'
    }
  }
  return normalizeWhitespace(text)
}

/** Throws PdfExtractionError unless the text is worth sending for analysis. */
export function assertAnalyzableText(text: string): void {
  if (text.replace(/\s/g, '').length < MIN_TEXT_CHARS) {
    throw new PdfExtractionError('no-text')
  }
  if (text.length > MAX_TEXT_LENGTH) {
    throw new PdfExtractionError('too-long')
  }
}

async function openDocument(loadingTask: PDFDocumentLoadingTask): Promise<PDFDocumentProxy> {
  try {
    return await loadingTask.promise
  } catch (error) {
    if (error instanceof pdfjs.PasswordException) {
      throw new PdfExtractionError('encrypted')
    }
    if (error instanceof pdfjs.InvalidPDFException) {
      throw new PdfExtractionError('invalid')
    }
    throw error
  }
}

/** Extracts plain text from every page of a PDF, entirely in the browser. */
export async function extractText(file: File): Promise<ExtractedText> {
  const loadingTask = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) })

  try {
    const document = await openDocument(loadingTask)
    const pageTexts: string[] = []
    let length = 0

    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber)
      const text = pageText(await page.getTextContent())
      page.cleanup()

      pageTexts.push(text)
      length += text.length
      // Stop parsing a 500-page document as soon as the answer is already "too long".
      if (length > MAX_TEXT_LENGTH) {
        throw new PdfExtractionError('too-long')
      }
    }

    const text = pageTexts.filter((pageContent) => pageContent !== '').join('\n\n')
    assertAnalyzableText(text)
    return { text, pages: document.numPages }
  } finally {
    // In pdf.js 6 the loading task owns the document: destroying it frees both.
    await loadingTask.destroy()
  }
}
