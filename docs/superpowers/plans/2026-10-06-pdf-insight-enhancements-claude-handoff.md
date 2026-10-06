# Claude Code handoff: PDF Insight enhancements

Implement the complete approved enhancement. Read these files first:

1. `AGENTS.md` and `CLAUDE.md` for repository conventions.
2. `docs/superpowers/specs/2026-10-06-pdf-insight-enhancements-design.md` for the approved scope.
3. `docs/superpowers/plans/2026-10-06-pdf-insight-enhancements.md` for the task-by-task implementation plan.

The spec and plan were approved by the user. Do not stop after one task; complete all four plan
tasks and update the plan checkboxes as you finish them.

## Repository context

The scaffold-era status paragraphs in `AGENTS.md` and `CLAUDE.md` are stale. The current checkout is
an implemented React app: `web/src/App.tsx` runs PDF extraction, calls the analysis API, displays
results, and saves history. `README.md` also documents the working application. Inspect the current
source before making changes; do not replace working code with scaffold implementations.

The approved work is frontend-only. Preserve the current PDF-in-browser flow, API contract, result
schema, localStorage history format, the existing JSON export, and the existing first-visit
Rickroll behavior. Do not add server changes, a database, a new state manager, or a UI library.
User-facing copy remains Polish; identifiers and code comments remain English.

## Implementation order

1. Add reduced-motion-aware dropzone/loading/result motion and the approved Polish microcopy.
2. Add result-section navigation, copy controls, and Markdown export while keeping JSON actions.
3. Add local history search and inclusive saved-date/amount filters; clearing history must reset
   filters.
4. Add side-by-side comparison for up to two saved results, including reset/pruning behavior and
   narrow-screen layout.

Follow the detailed file list and behavior in the implementation plan. Run its frontend lint,
format, typecheck, and build commands from `web/`. Do not run `npm` commands from the repository
root. Do not push or deploy this work.

## Completion report

When all four tasks are complete, summarize the implemented features, changed files, and which
frontend checks succeeded or failed. Call out any remaining limitation instead of silently
omitting a requirement.
