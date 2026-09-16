import { describe, expect, it } from 'vitest'
import { isPdf, validateSelection } from './fileValidation'
import { MAX_FILE_BYTES } from './limits'

function pdf(overrides: Partial<{ name: string; type: string; size: number }> = {}) {
  return { name: 'umowa.pdf', type: 'application/pdf', size: 1024, ...overrides }
}

describe('isPdf', () => {
  it('accepts the PDF MIME type', () => {
    expect(isPdf({ name: 'bez-rozszerzenia', type: 'application/pdf' })).toBe(true)
  })

  it('accepts a .pdf extension when the system reports no MIME type', () => {
    expect(isPdf({ name: 'FAKTURA.PDF', type: '' })).toBe(true)
  })

  it('rejects other files', () => {
    expect(isPdf({ name: 'notatki.docx', type: 'application/msword' })).toBe(false)
  })
})

describe('validateSelection', () => {
  it('accepts a single PDF under the limit', () => {
    const file = pdf()

    expect(validateSelection([file])).toEqual({ ok: true, file })
  })

  it('accepts a PDF of exactly 10 MB', () => {
    expect(validateSelection([pdf({ size: MAX_FILE_BYTES })]).ok).toBe(true)
  })

  it('rejects a PDF one byte over 10 MB and states both sizes', () => {
    const selection = validateSelection([pdf({ size: MAX_FILE_BYTES + 1 })])

    expect(selection).toEqual({
      ok: false,
      message: 'Plik ma 10,1 MB, a maksymalny rozmiar to 10 MB.',
      fileName: 'umowa.pdf',
    })
  })

  it('reports the real size of a clearly oversized file', () => {
    const selection = validateSelection([pdf({ size: 15.5 * 1024 * 1024 })])

    expect(selection.ok || selection.message).toBe(
      'Plik ma 15,5 MB, a maksymalny rozmiar to 10 MB.',
    )
  })

  it('rejects a non-PDF and keeps its name for the error screen', () => {
    expect(validateSelection([pdf({ name: 'zdjecie.png', type: 'image/png' })])).toMatchObject({
      ok: false,
      fileName: 'zdjecie.png',
    })
  })

  it('rejects an empty file', () => {
    expect(validateSelection([pdf({ size: 0 })])).toMatchObject({
      ok: false,
      message: 'Wybrany plik jest pusty.',
    })
  })

  it('rejects several files at once instead of silently picking one', () => {
    expect(validateSelection([pdf(), pdf({ name: 'drugi.pdf' })])).toMatchObject({
      ok: false,
      message: 'Wybierz lub upuść jeden plik PDF naraz.',
    })
  })

  it('rejects an empty selection', () => {
    expect(validateSelection([])).toMatchObject({ ok: false, fileName: null })
  })
})
