// MUST mirror AnalysisResultSchema in ./schema.ts

import { Type, type Schema } from '@google/genai'
import { DOCUMENT_TYPES } from './schema.js'

/*
 * Hand-written OpenAPI-subset response schema for Gemini structured output.
 *
 * Deliberately NOT generated from Zod: the generators emit `$ref`, `anyOf` and
 * `$schema`, which fall outside the subset Gemini accepts. Hand-written is
 * deterministic and debuggable.
 *
 * `propertyOrdering` is set on every object so the model emits fields in a fixed
 * order — ordering drift is a known cause of degraded structured output.
 *
 * Constraints Gemini does not enforce (string `pattern`, sentence counts) are
 * carried as `description` here and re-checked by Zod in ./gemini.ts. The schema
 * shapes the output; AnalysisResultSchema is what actually guarantees it.
 */

const DOCUMENT_FIELDS = ['fileName', 'pages', 'language', 'type', 'title', 'date']
const AMOUNT_FIELDS = ['value', 'currency', 'context']
const DATE_FIELDS = ['date', 'context']
const ENTITY_FIELDS = ['organizations', 'people']
const RESULT_FIELDS = [
  'document',
  'summary',
  'keyPoints',
  'entities',
  'amounts',
  'dates',
  'keywords',
]

const documentSchema: Schema = {
  type: Type.OBJECT,
  description: 'Metadane analizowanego dokumentu.',
  properties: {
    fileName: {
      type: Type.STRING,
      description: 'Nazwa pliku. Zostanie i tak nadpisana po stronie serwera.',
    },
    pages: {
      type: Type.INTEGER,
      description: 'Liczba stron. Zostanie i tak nadpisana po stronie serwera.',
    },
    language: {
      type: Type.STRING,
      description: 'Kod ISO 639-1 języka dokumentu, dokładnie dwie małe litery, np. "pl".',
    },
    type: {
      type: Type.STRING,
      enum: [...DOCUMENT_TYPES],
      description: 'Rodzaj dokumentu. Gdy nie pasuje do żadnej kategorii, użyj "inne".',
    },
    title: {
      type: Type.STRING,
      description: 'Tytuł dokumentu. Gdy brak wprost — krótki opisowy tytuł z treści.',
    },
    date: {
      type: Type.STRING,
      nullable: true,
      description:
        'Główna data dokumentu w formacie ISO 8601 (YYYY-MM-DD) albo null, gdy dokument jej nie podaje. Nie zgaduj.',
    },
  },
  required: DOCUMENT_FIELDS,
  propertyOrdering: DOCUMENT_FIELDS,
}

const amountSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    value: { type: Type.NUMBER, description: 'Kwota liczbowo, bez separatorów tysięcy.' },
    currency: {
      type: Type.STRING,
      description: 'Kod waluty ISO 4217 — dokładnie trzy wielkie litery, np. "PLN". Nigdy symbol.',
    },
    context: { type: Type.STRING, description: 'Czego dotyczy kwota, kilka słów z dokumentu.' },
  },
  required: AMOUNT_FIELDS,
  propertyOrdering: AMOUNT_FIELDS,
}

const dateMentionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    date: {
      type: Type.STRING,
      description:
        'Data w formacie ISO 8601 (YYYY-MM-DD). Pomiń wpis, jeśli daty nie da się zapisać w tym formacie.',
    },
    context: { type: Type.STRING, description: 'Czego dotyczy data, kilka słów z dokumentu.' },
  },
  required: DATE_FIELDS,
  propertyOrdering: DATE_FIELDS,
}

const entitiesSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    organizations: {
      type: Type.ARRAY,
      description: 'Nazwy organizacji wymienione w dokumencie. Pusta lista, gdy brak.',
      items: { type: Type.STRING },
    },
    people: {
      type: Type.ARRAY,
      description: 'Imiona i nazwiska osób wymienione w dokumencie. Pusta lista, gdy brak.',
      items: { type: Type.STRING },
    },
  },
  required: ENTITY_FIELDS,
  propertyOrdering: ENTITY_FIELDS,
}

export const analysisResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    document: documentSchema,
    summary: {
      type: Type.STRING,
      description: 'Streszczenie dokumentu: od 3 do 5 pełnych zdań, w języku dokumentu.',
    },
    keyPoints: {
      type: Type.ARRAY,
      description: 'Od 3 do 7 najważniejszych ustaleń, każde jako jedno zwięzłe zdanie.',
      items: { type: Type.STRING },
      minItems: '3',
      maxItems: '7',
    },
    entities: entitiesSchema,
    amounts: {
      type: Type.ARRAY,
      description: 'Kwoty występujące w dokumencie. Pusta lista, gdy brak.',
      items: amountSchema,
    },
    dates: {
      type: Type.ARRAY,
      description: 'Daty występujące w dokumencie. Pusta lista, gdy brak.',
      items: dateMentionSchema,
    },
    keywords: {
      type: Type.ARRAY,
      description: 'Słowa kluczowe opisujące dokument. Pusta lista, gdy brak.',
      items: { type: Type.STRING },
    },
  },
  required: RESULT_FIELDS,
  propertyOrdering: RESULT_FIELDS,
}
