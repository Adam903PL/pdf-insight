# PDF Insight Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add polished accessible motion, useful local history/result tools, side-by-side analysis comparison, and friendly Polish microcopy to PDF Insight.

**Architecture:** Keep all changes in the existing React frontend. Derive search/filter results from the current `HistoryEntry[]`, keep comparison selection in `App` state, and format copy/Markdown exports from the current `AnalysisResult`; do not change API contracts, server code, or localStorage schema.

**Tech Stack:** React 18, TypeScript strict, Tailwind CSS 4, browser Clipboard and Blob APIs, existing `Intl` formatters.

---

## File map

- Modify `web/src/App.tsx` to own comparison selection/open state and reset it when history is cleared or entries are trimmed.
- Modify `web/src/components/FileDropzone.tsx` and `web/src/components/LoadingState.tsx` for decorative motion and friendly copy while preserving the existing Rickroll and real processing states.
- Modify `web/src/components/ResultView.tsx` for section navigation, per-section copying, Markdown action, and success entrance motion.
- Modify `web/src/components/HistoryPanel.tsx` for search, date/amount filters, comparison selection, and filtered-empty state.
- Create `web/src/components/ComparisonView.tsx` as a display-only view for two saved results.
- Create `web/src/lib/filterHistory.ts` for pure filtering and Polish-insensitive search normalization.
- Create `web/src/lib/markdown.ts` for deterministic `AnalysisResult` to Markdown formatting.
- Create `web/src/lib/downloadMarkdown.ts` for the browser download side effect.
- Modify `web/src/index.css` for short motion-safe keyframes that fit the existing paper-and-stamp theme.

## Task 1: Add accessible motion and friendly processing copy

**Files:** `web/src/index.css`, `web/src/components/FileDropzone.tsx`, `web/src/components/LoadingState.tsx`, `web/src/components/ResultView.tsx`

- [x] **Step 1: Add motion-safe keyframes and dropzone feedback**

In `web/src/index.css`, add two keyframes inside `@theme`: `result-enter` from `opacity: 0; translate: 0 0.5rem` to `opacity: 1; translate: 0 0`, and `paper-scan` from `translateX(-110%)` to `translateX(110%)`. Add `--animate-result-enter: result-enter 220ms ease-out both` and `--animate-paper-scan: paper-scan 1.8s ease-in-out infinite`.

In `FileDropzone.tsx`, preserve all drag event behavior and Rickroll logic. Add `motion-safe:scale-[1.01]` to the active `dragging` state, keep the existing `transition-colors`, and add `motion-safe:transition-transform`. The non-dragging and disabled classes remain unchanged.

- [x] **Step 2: Make loading motion decorative and copy natural**

In `LoadingState.tsx`, retain the existing two real steps and spinner. Add an `aria-hidden="true"` decorative paper/document stack beside the heading with the scan line using `motion-safe:animate-paper-scan`. Do not add a percentage or elapsed-time estimate. Use `Czytamy tekst lokalnie — sam PDF zostaje u Ciebie.` for extraction and `Porządkujemy najważniejsze informacje. Zwykle trwa to od 5 do 15 sekund.` for analysis. Keep `Odczytano tekst z {pages} str.` for the completed extraction step.

- [x] **Step 3: Add result entrance motion and a restrained success accent**

Add `motion-safe:animate-result-enter` to the outer result article in `ResultView.tsx`. Add one static decorative sparkle/check accent next to the result title with `aria-hidden="true"` and the short label `Gotowe. Papierologia w ryzach.`; do not add a looping celebration animation. The existing document-type stamp and focus management remain unchanged.

- [x] **Step 4: Run frontend static checks**

Run from `web/`: `npm run lint`, `npm run format:check`, and `npm run typecheck`.

Expected: each command exits 0. If format check reports the touched files, run `npm run format` and repeat the three commands. Do not run or add test suites as part of this plan.

## Task 2: Add result section navigation, copy actions, and Markdown export

**Files:** create `web/src/lib/markdown.ts`, create `web/src/lib/downloadMarkdown.ts`, modify `web/src/components/ResultView.tsx`

- [x] **Step 1: Create deterministic Markdown formatting**

Create `markdown.ts` with `export function resultToMarkdown(result: AnalysisResult): string`. Import `AnalysisResult` as a type and the existing `DOCUMENT_TYPE_LABELS`, `formatAmount`, `formatIsoDate`, and `languageName` helpers. Return headings and plain Markdown lists in this order: title; document type, file name, date, page count, and language; summary; key points; organizations and people; amounts with context; dates with context; keywords. Use `-` list items, omit absent optional date/amount content rather than inventing values, and join lines with `\n`.

- [x] **Step 2: Create a safe browser Markdown download helper**

Create `downloadMarkdown.ts` with `export function downloadMarkdown(result: AnalysisResult): boolean`. Call `resultToMarkdown`, create a `Blob` with MIME `text/markdown;charset=utf-8`, create an object URL, click a temporary anchor with a sanitized filename derived from `result.document.fileName` (replace its extension with `.md` and replace path separators/control characters), then remove the anchor and revoke the object URL in `finally`. Return `true` on success and `false` if the browser download setup throws.

- [x] **Step 3: Give result sections stable anchors and copy controls**

In `ResultView.tsx`, add stable section IDs `summary`, `key-points`, `entities`, `amounts`, `dates`, and `keywords`. Add a `<details>` navigation block before the sections, with a `<summary>` labeled `Nawigacja po wyniku` and links to each section. Give sections `scroll-mt-4` so fragment targets are not hidden when scrolled into view.

Extend the local `Section` component with `id`, `copyText`, `copyStatus`, and `onCopy` props. For each of the six result sections, construct plain text from that section's existing data and show a `Kopiuj` button. Use a single `copiedSectionId` state; on clipboard success set the ID, and on rejection set an error state for that section. Render feedback in `aria-live="polite"` beside the control; when copy fails, say the section can be selected and copied manually. Keep the existing JSON copy state and button independent.

- [x] **Step 4: Add Markdown action without removing JSON actions**

Import `downloadMarkdown`. Add a secondary `Pobierz Markdown` button next to `Pobierz JSON` and `Kopiuj JSON`. If the helper returns `false`, show an inline Polish error message and leave both existing JSON actions available. If it returns `true`, show a polite success message.

- [x] **Step 5: Run frontend static checks**

Run from `web/`: `npm run lint`, `npm run format:check`, and `npm run typecheck`.

Expected: each command exits 0. Run `npm run format` only if format check requires it, then repeat the checks. Do not run test commands.

## Task 3: Add local search and combined history filters

**Files:** create `web/src/lib/filterHistory.ts`, modify `web/src/components/HistoryPanel.tsx`, modify `web/src/App.tsx`

- [ ] **Step 1: Define filter types and normalization**

Create `filterHistory.ts` with:

```ts
export type HistoryFilters = {
  query: string
  createdFrom: string
  createdTo: string
  withAmounts: boolean
}

export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase('pl-PL')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replaceAll('ł', 'l')
    .trim()
}
```

- [ ] **Step 2: Implement pure filter derivation**

In the same file, export `filterHistory(entries: readonly HistoryEntry[], filters: HistoryFilters): HistoryEntry[]`. Normalize the query once. For each entry, search only `result.document.title`, `result.document.fileName`, and `DOCUMENT_TYPE_LABELS[result.document.type]`. Compare the first 10 characters of `createdAt` lexically against non-empty `createdFrom` and `createdTo`; a date equal to either bound is included. If `withAmounts` is true, require `result.amounts.length > 0`. All four conditions combine with AND, and source order is preserved.

- [ ] **Step 3: Add controlled local controls to HistoryPanel**

Keep search/filter state inside `HistoryPanel`, initialized as `{ query: '', createdFrom: '', createdTo: '', withAmounts: false }`. Derive visible rows with `filterHistory`; never modify or persist the original `entries` array. Add a labeled search input, two labeled `type="date"` inputs, and a labeled checkbox `Zawiera kwoty`. Add `Wyczyść filtry`, visible only when a filter is active. Preserve the existing full-history empty state. When filters are active and no row matches, show `Nie znaleziono analiz dla tych filtrów.` and a button that restores defaults. Accept a numeric `filtersResetKey` prop; use an effect to restore default filters whenever the key changes.

In `App.tsx`, keep `filtersResetKey` as a number. Increment it in the same `onClear` callback that calls `clearHistory()`. Pass the value to `HistoryPanel`; this resets local filters on clear without resetting them when a new analysis is added.

- [ ] **Step 4: Run frontend static checks**

Run from `web/`: `npm run lint`, `npm run format:check`, and `npm run typecheck`.

Expected: each command exits 0. Run the formatter only if needed. Do not run test commands.

## Task 4: Add two-result comparison

**Files:** create `web/src/components/ComparisonView.tsx`, modify `web/src/components/HistoryPanel.tsx`, modify `web/src/App.tsx`

- [ ] **Step 1: Create a display-only comparison component**

Create `ComparisonView.tsx` with props `{ entries: readonly [HistoryEntry, HistoryEntry]; onClose: () => void }`. Render a heading, a `Zamknij porównanie` button, and two labeled result columns. Each column displays document title and type, summary, key points, organizations, people, amounts with contexts, and dates with contexts. Use existing `formatAmount`, `formatIsoDate`, and `DOCUMENT_TYPE_LABELS`. At desktop widths use two equal columns; at narrow widths stack them. Do not call `ResultView`, the API, or localStorage from this component.

- [ ] **Step 2: Add comparison selection to history**

Extend `HistoryPanelProps` with `compareIds: readonly string[]`, `onToggleCompare: (entry: HistoryEntry) => void`, and `onOpenComparison: () => void`. Add one checkbox per visible history entry with an associated label `Dodaj <title> do porównania`. Put the existing row button and checkbox as sibling controls inside a flex `<li>`; never nest the checkbox inside the row button. Cap selection at two: when two IDs are selected, disable unchecked comparison checkboxes; checked entries remain removable. Show `Porównaj (2)` only when exactly two entries are selected. Keep clicking the existing history row button behavior unchanged.

- [ ] **Step 3: Wire comparison state in App**

In `App.tsx`, add `compareIds: string[]` and `comparisonOpen: boolean` state. Toggle IDs immutably, enforcing the same maximum of two. Derive the comparison tuple by looking up both IDs in `history.entries`; enable the open action only when both entries still exist. In the existing result column, render `ComparisonView` when `comparisonOpen` and the tuple is valid; otherwise render `StatusView`. Closing comparison returns to `StatusView`. When a history entry is selected, close comparison before dispatching `HISTORY_ENTRY_OPENED`. When clearing history, clear `compareIds`, close the comparison, and increment `filtersResetKey`. After adding an analysis, prune IDs no longer present in the returned `HistoryState.entries`, since history is capped at 10.

- [ ] **Step 4: Keep comparison usable with active filters**

Keep selected IDs independent from search and filters, so typing a query does not silently discard a selection. Show a small selected-count message in `HistoryPanel`, even when a selected row is filtered out. The open action continues to resolve entries from the full history, not from the filtered list.

- [ ] **Step 5: Run frontend static checks**

Run from `web/`: `npm run lint`, `npm run format:check`, and `npm run typecheck`.

Expected: each command exits 0. Run `npm run format` only if needed, then repeat the checks. Do not run test commands.

## Completion criteria

- Upload, loading, result, history filtering, comparison, copy, and both download controls implement
  the approved behaviors and keep current upload/error/history behavior intact.
- Comparison handles two entries only, resets when history is cleared, and prunes IDs removed by the
  ten-entry history cap.
- The six result sections have stable navigation anchors and plain-text copy actions. Markdown
  contains every result field represented in the current result view.
- Search normalization covers Polish diacritics including `ł`; date bounds are inclusive and all
  active filters combine with AND.
- Reduced-motion preferences suppress decorative movement without hiding status information.
- The existing Rickroll trigger and `AnalysisResult`/localStorage/API contracts remain unchanged.
- Run from `web/`: `npm run lint`, `npm run format:check`, `npm run typecheck`, and `npm run build`
  (with the existing `VITE_API_URL` configuration available). Expected: all four commands exit 0.
