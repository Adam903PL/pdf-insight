export type JsonPreviewProps = {
  data: unknown
}

export function JsonPreview({ data }: JsonPreviewProps) {
  // TODO: copy to clipboard, download as .json.
  return (
    <pre className="overflow-x-auto rounded-lg bg-gray-900 p-4 text-xs text-gray-100">
      {JSON.stringify(data, null, 2)}
    </pre>
  )
}
