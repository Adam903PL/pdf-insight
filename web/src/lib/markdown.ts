import { jsonFileName } from './exportJson'
import {
  DOCUMENT_TYPE_LABELS,
  formatIsoDate,
  formatPages,
  languageName,
  sortByDate,
} from './format'
import {
  amountLine,
  bulletList,
  dateLine,
  RESULT_SECTIONS,
  singleLine,
  type ResultSectionId,
} from './resultSections'
import type { AnalysisResult } from './schema'

/** A section's Markdown body, or null when it has nothing to say (it is then left out). */
function sectionBody(result: AnalysisResult, id: ResultSectionId): string | null {
  const { summary, keyPoints, entities, amounts, dates, keywords } = result
  switch (id) {
    case 'summary':
      return summary.trim()
    case 'key-points':
      return bulletList(keyPoints)
    case 'entities': {
      const groups = [
        { label: 'Organizacje', names: entities.organizations },
        { label: 'Osoby', names: entities.people },
      ].filter(({ names }) => names.length > 0)
      if (groups.length === 0) return null
      return groups.map(({ label, names }) => `### ${label}\n\n${bulletList(names)}`).join('\n\n')
    }
    case 'amounts':
      return amounts.length === 0 ? null : bulletList(amounts.map(amountLine))
    case 'dates':
      return dates.length === 0 ? null : bulletList(sortByDate(dates).map(dateLine))
    case 'keywords':
      return keywords.length === 0 ? null : bulletList(keywords)
  }
}

/**
 * The result as a readable Markdown document, in the order of the result view. Absent
 * content (no document date, an empty section) is left out rather than filled in.
 */
export function resultToMarkdown(result: AnalysisResult): string {
  const { document: documentInfo } = result
  const details = [
    `Rodzaj dokumentu: ${DOCUMENT_TYPE_LABELS[documentInfo.type]}`,
    `Plik: ${documentInfo.fileName}`,
    ...(documentInfo.date === null ? [] : [`Data dokumentu: ${formatIsoDate(documentInfo.date)}`]),
    `Objętość: ${formatPages(documentInfo.pages)}`,
    `Język: ${languageName(documentInfo.language)}`,
  ]

  const blocks = [`# ${singleLine(documentInfo.title)}`, bulletList(details)]
  for (const { id, title } of RESULT_SECTIONS) {
    const body = sectionBody(result, id)
    if (body !== null) blocks.push(`## ${title}`, body)
  }
  return `${blocks.join('\n\n')}\n`
}

/** `Umowa serwisowa.pdf` → `Umowa serwisowa-analiza.md`, sanitised like the JSON file. */
export function markdownFileName(pdfFileName: string): string {
  return jsonFileName(pdfFileName).replace(/\.json$/, '.md')
}
