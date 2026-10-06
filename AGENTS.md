# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project state

PDF Insight is a **scaffold, not a working app**. Config, types, the shared schema and
schema tests are real; nearly every function body is a stub that `throw new Error('Not implemented')`
with a TODO comment describing the intended behaviour. Treat those TODOs as the spec —
read the one above a function before implementing it.

Already implemented: `schema.ts` (both copies), `cors.ts`, `getApiBaseUrl()`, the `AppState`/`AppAction`
union in `App.tsx`, and `web/src/lib/schema.test.ts`.

`README.md` and `AI_LOG.md` are Polish skeletons full of `TODO` and are part of the deliverable.
UI copy is Polish (`<html lang="pl">`); code, comments and identifiers are English.

## Layout & commands

Two **independent** npm packages, no root `package.json` and no workspace tooling. Install and
run commands inside `web/` or `server/` — never from the repo root.

```bash
# web/  (Node >= 22.13)
npm run dev          # vite dev server, :5173
npm run build        # needs VITE_API_URL at build time
npm run lint && npm run format:check && npm run typecheck && npm test   # what CI runs
npm test -- src/lib/schema.test.ts          # single file
npm test -- -t 'rejects an unknown document type'   # single test by name

# server/  (Node >= 20.19)
npm run dev          # tsx watch, loads server/.env via --env-file
npm run build        # tsc -> dist/
npm start            # node dist/index.js
npm run lint && npm run format:check && npm run typecheck
```

`web` typecheck runs **two** tsconfig projects (`tsconfig.json` for `src`, `tsconfig.node.json` for
the vite/vitest configs); a type error in `vite.config.ts` only shows up in the second.

## Architecture

The PDF never leaves the browser. `pdfjs-dist` extracts text client-side, and only
`{ fileName, pages, text }` is POSTed to the backend — this is what keeps `GEMINI_API_KEY`
server-side and the payload small.

```
FileDropzone → lib/pdf.ts extractText()      (browser, pdfjs-dist)
             → lib/api.ts analyze()          POST {VITE_API_URL}/api/analyze
             → server: AnalyzeRequestSchema.parse → gemini.ts analyzeDocument()
                       → AnalysisResultSchema.parse (Gemini output is untrusted)
             → ResultView + lib/history.ts saveHistoryEntry()  (localStorage)
```

`App.tsx` drives this with a reducer over `idle → extracting → analyzing → success | error`
(+ `RESET`). Add UI states by extending the `AppState`/`AppAction` unions — `StatusView`'s
switch is exhaustive and will fail typecheck if a case is missed.

### The duplicated schema

`web/src/lib/schema.ts` and `server/src/schema.ts` are **deliberately identical copies** (no shared
package). Any change to the analysis-result contract must be applied to both files in the same
commit. The server copy additionally appends `MAX_TEXT_LENGTH` and `AnalyzeRequestSchema` below
the `// --- Server only ---` marker; the web copy must not grow those.

### CORS & rate limiting

`corsMiddleware()` is mounted on `/api/*` only, so `/health` deliberately returns no
`Access-Control-Allow-Origin` — verify CORS against `/api/analyze`, not `/health`. It also throws
at startup when `ALLOWED_ORIGIN` is unset or is not a bare origin, so a missing variable is a
crash-loop, not a silent misconfiguration.

`rateLimit()` is an in-memory per-process fixed window (no Redis, by design): it resets on restart
and is not shared across instances. Currently pass-through.

## Deployment

- **web → GitHub Pages** via `.github/workflows/deploy.yml` (lint → build → deploy on push to `main`).
  Requires the repo *variable* `VITE_API_URL`; the build job fails loudly if it is missing.
  `vite.config.ts` hardcodes `base: '/pdf-insight/'` — renaming the repo means changing it.
  The pdf.js worker is imported as `?url` so it resolves under that base path; do not swap it for a
  CDN or the default worker path.
- **server → Railway**, root dir `server`, healthcheck `/health`.
- CI covers `web` only — `server` lint/typecheck must be run locally before pushing.

## Conventions

- Prettier (identical in both packages): no semicolons, single quotes, trailing commas, width 100.
  `format:check` is a CI gate, so run `npm run format` before committing.
- `no-console` is an **error** in both packages. Server logging goes through `process.stdout.write`.
- TS is strict with `noUncheckedIndexedAccess`, `noUnusedLocals`/`noUnusedParameters`,
  `verbatimModuleSyntax` and `erasableSyntaxOnly` (no enums, no parameter properties).
  Unused params must be `_`-prefixed — the stubs rely on this.
- Module resolution differs: **server** is `NodeNext`, so relative imports need the `.js` extension
  (`./cors.js`); **web** is `bundler` and uses the `@/` alias for `web/src`.
- Errors are explicit and typed at the boundary. Follow the existing style: fail fast with an
  actionable message (see `corsMiddleware`, `getApiBaseUrl`, the `PORT` check) rather than
  falling back to a default.

## Environment variables

| Where | Variable | Notes |
|---|---|---|
| `server/.env` | `GEMINI_API_KEY` | server-side only, never reaches the client |
| `server/.env` | `ALLOWED_ORIGIN` | exact origin, no path/trailing slash/wildcard; validated at boot |
| `server/.env` | `PORT` | defaults to 3000 |
| `web/.env` | `VITE_API_URL` | build-time inlined and therefore public; no trailing slash |

Both packages ship a `.env.example`; copy it rather than inventing variable names.

## Scope constraints (deliberate, do not "improve")

No database. No Redis. No queues. No Docker. No react-router.
No state manager (useReducer only). No monorepo workspaces.
No multi-provider AI abstraction. No UI component library.
History lives in localStorage only — this is what the brief specifies.
Schema duplication between web/ and server/ is intentional.
server/ has no CI by design; lint and typecheck run locally.
