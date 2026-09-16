import { MAX_FILE_BYTES } from './limits'

type FileLike = Pick<File, 'name' | 'type' | 'size'>

export type FileSelection<T extends FileLike> =
  { ok: true; file: T } | { ok: false; message: string; fileName: string | null }

const MEGABYTE = 1024 * 1024

/** Rounded up, so a file just over the limit never reads as "10 MB, limit 10 MB". */
function megabytes(bytes: number): string {
  const tenths = Math.ceil((bytes / MEGABYTE) * 10) / 10
  return tenths.toLocaleString('pl-PL', { maximumFractionDigits: 1 })
}

/**
 * Some systems report an empty MIME type for PDFs, so the extension counts too. A file
 * that merely claims to be a PDF is caught later by pdf.js with its own message.
 */
export function isPdf(file: Pick<File, 'name' | 'type'>): boolean {
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
}

/** Checks a picked or dropped selection against brief F-01: one PDF, at most 10 MB. */
export function validateSelection<T extends FileLike>(files: readonly T[]): FileSelection<T> {
  const [file] = files
  if (file === undefined) {
    return { ok: false, message: 'Nie wybrano pliku.', fileName: null }
  }
  if (files.length > 1) {
    return { ok: false, message: 'Wybierz lub upuść jeden plik PDF naraz.', fileName: null }
  }
  if (!isPdf(file)) {
    return {
      ok: false,
      message: 'Wybrany plik nie jest dokumentem PDF. Wybierz plik z rozszerzeniem .pdf.',
      fileName: file.name,
    }
  }
  if (file.size === 0) {
    return { ok: false, message: 'Wybrany plik jest pusty.', fileName: file.name }
  }
  if (file.size > MAX_FILE_BYTES) {
    return {
      ok: false,
      message: `Plik ma ${megabytes(file.size)} MB, a maksymalny rozmiar to ${megabytes(MAX_FILE_BYTES)} MB.`,
      fileName: file.name,
    }
  }
  return { ok: true, file }
}
