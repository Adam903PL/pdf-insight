import { describe, expect, it, vi } from 'vitest'
import { MAX_TEXT_LENGTH, MIN_TEXT_CHARS } from './limits'

// pdf.ts wires pdf.js to its bundled worker at import time; these tests cover only the
// pure text helpers, so the real library is not needed.
vi.mock('pdfjs-dist', () => ({ GlobalWorkerOptions: {} }))
vi.mock('pdfjs-dist/build/pdf.worker.min.mjs?url', () => ({ default: 'worker.mjs' }))

const { assertAnalyzableText, normalizeWhitespace, pageText, PdfExtractionError } =
  await import('./pdf')

function textItem(str: string, hasEOL = false) {
  return { str, hasEOL, dir: 'ltr', transform: [], width: 0, height: 0, fontName: 'f' }
}

function kindOf(run: () => void): string | undefined {
  try {
    run()
  } catch (error) {
    return error instanceof PdfExtractionError ? error.kind : 'unexpected'
  }
  return undefined
}

describe('normalizeWhitespace', () => {
  it('collapses spaces, trims line edges and caps blank lines at one', () => {
    expect(normalizeWhitespace('  Umowa \t  serwisowa \n\n\n\n  § 1  ')).toBe(
      'Umowa serwisowa\n\n§ 1',
    )
  })

  it('treats non-breaking spaces as ordinary spaces', () => {
    const nbsp = String.fromCharCode(160)
    expect(normalizeWhitespace(`12${nbsp}500${nbsp}zł`)).toBe('12 500 zł')
  })
})

describe('pageText', () => {
  it('joins items and breaks lines where pdf.js marks an end of line', () => {
    const content = {
      items: [textItem('Umowa'), textItem(' serwisowa', true), textItem('§ 1. Przedmiot')],
    }

    expect(pageText(content)).toBe('Umowa serwisowa\n§ 1. Przedmiot')
  })

  it('skips marked-content entries that carry no text', () => {
    const content = {
      items: [{ type: 'beginMarkedContent', id: 'mc1' }, textItem('Faktura')],
    }

    expect(pageText(content)).toBe('Faktura')
  })
})

describe('assertAnalyzableText', () => {
  it('accepts ordinary document text', () => {
    expect(kindOf(() => assertAnalyzableText('a'.repeat(MIN_TEXT_CHARS)))).toBeUndefined()
  })

  it('reports a missing text layer when only whitespace was extracted', () => {
    expect(kindOf(() => assertAnalyzableText(' \n\n \t '))).toBe('no-text')
  })

  it('counts visible characters, not whitespace, against the minimum', () => {
    const almost = 'a '.repeat(MIN_TEXT_CHARS - 1)

    expect(kindOf(() => assertAnalyzableText(almost))).toBe('no-text')
  })

  it('rejects text over the server limit', () => {
    expect(kindOf(() => assertAnalyzableText('a'.repeat(MAX_TEXT_LENGTH + 1)))).toBe('too-long')
  })

  it('accepts text exactly at the server limit', () => {
    expect(kindOf(() => assertAnalyzableText('a'.repeat(MAX_TEXT_LENGTH)))).toBeUndefined()
  })
})
