export type JsonPreviewProps = {
  json: string
}

/** Collapsed by default so the readable view stays first; native details is keyboard-ready. */
export function JsonPreview({ json }: JsonPreviewProps) {
  return (
    <details className="group">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 font-semibold [&::-webkit-details-marker]:hidden">
        <svg
          viewBox="0 0 16 16"
          className="size-4 text-stamp transition-transform group-open:rotate-90"
          aria-hidden="true"
        >
          <path d="M6 3l5 5-5 5" fill="none" stroke="currentColor" strokeWidth="2" />
        </svg>
        Podgląd JSON
      </summary>
      {/* tabIndex lets keyboard users scroll the long preview. */}
      <pre
        tabIndex={0}
        className="mt-3 max-h-96 overflow-auto rounded-md bg-ink p-4 text-xs leading-relaxed text-paper"
      >
        <code>{json}</code>
      </pre>
    </details>
  )
}
