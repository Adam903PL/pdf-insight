import type { ChangeEvent } from 'react'

export type FileDropzoneProps = {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

export function FileDropzone({ onFileSelected, disabled = false }: FileDropzoneProps) {
  // TODO: drag & drop, PDF type/size validation, drag-over styling.
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onFileSelected(file)
  }

  return (
    <label className="block cursor-pointer rounded-lg border-2 border-dashed border-gray-300 p-8 text-center">
      <span>Wybierz plik PDF</span>
      <input
        type="file"
        accept="application/pdf"
        className="sr-only"
        disabled={disabled}
        onChange={handleChange}
      />
    </label>
  )
}
