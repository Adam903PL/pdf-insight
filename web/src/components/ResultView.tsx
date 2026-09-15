import type { AnalysisResult } from '@/lib/schema'
import { JsonPreview } from './JsonPreview'

export type ResultViewProps = {
  result: AnalysisResult
}

export function ResultView({ result }: ResultViewProps) {
  // TODO: sections for summary, key points, entities, amounts, dates and keywords.
  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">{result.document.title}</h2>
      <JsonPreview data={result} />
    </section>
  )
}
