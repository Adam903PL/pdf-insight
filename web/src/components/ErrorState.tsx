export type ErrorStateProps = {
  message: string
  onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  // TODO: map error kinds (extraction, network, validation, rate limit) to user-facing copy.
  return (
    <div role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
      <p>{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 underline">
          Spróbuj ponownie
        </button>
      )}
    </div>
  )
}
