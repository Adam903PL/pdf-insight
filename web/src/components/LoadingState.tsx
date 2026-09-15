export type LoadingStateProps = {
  stage: 'extracting' | 'analyzing'
}

const STAGE_LABELS: Record<LoadingStateProps['stage'], string> = {
  extracting: 'Wyodrębnianie tekstu z PDF…',
  analyzing: 'Analiza dokumentu…',
}

export function LoadingState({ stage }: LoadingStateProps) {
  // TODO: spinner / progress indicator.
  return (
    <p role="status" className="text-gray-600">
      {STAGE_LABELS[stage]}
    </p>
  )
}
