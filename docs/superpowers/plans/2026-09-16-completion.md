# PDF Insight completion plan

**Goal:** Finish the existing delivery: correct invalid AI response retries, publish accurate
documentation and verify both production deployments.

**Architecture:** Keep the browser-only PDF parser, Hono proxy, duplicated Zod schemas and
localStorage history. Treat JSON syntax errors and schema errors as the same retryable output
validation boundary. Keep provider failures separate and share the existing 25-second deadline.

**Stack:** React, TypeScript, pdf.js, Hono, Gemini, Zod; Node's built-in test runner for the backend.

## 1. Backend regression tests and fix

- [x] Add `server/test/gemini.test.js`, importing the compiled public `analyzeDocument` API and
      replacing only HTTP transport with `node:test` mocks. Cover invalid JSON followed by valid
      output, two invalid outputs, schema failures, successful first response, metadata override and
      provider failure. No live API key or network request in tests.
- [x] Add `"test": "npm run build && node --test test/gemini.test.js"` to `server/package.json`.
- [x] Run `npm test` in `server/`; confirm malformed JSON cases fail before changing implementation.
- [x] Replace throwing JSON parsing in `server/src/gemini.ts` with a discriminated validation
      result (`success/data` or `success/issues`). Feed syntax errors into the existing single retry.
      A second syntax failure must throw `AiValidationError`, mapped by the route to HTTP 502.
- [x] Use `process.stdout.write` in `server/src/logger.ts` per repository conventions.
- [x] Run backend tests and all lint, formatting and type checks.

## 2. Delivery documentation

- [x] Complete `README.md`: public links, screenshot in `docs/`, architecture, stack, exact local
      startup commands, environment variables, deployment configuration, tests and known limits.
- [x] Finish the existing local `AI_LOG.md`, preserving Claude's history and attributing new work
      to Codex. Distinguish agent-run checks from unconfirmed independent human testing.
- [x] Capture a real screenshot of the public demo using synthetic, non-sensitive document data.
- [x] Verify documentation commands and links, absence of placeholders and schema parity.

## 3. Release verification

Implementation checks below are complete. The release procedure follows them; final deployment
status is verified against GitHub Actions and Railway after the push.

- [x] Run frontend lint, format check, typecheck, all tests and production build; run corresponding
      backend checks, tests and build. Review the final diff and stage only intended deliverables.
- Commit the implementation and documentation separately with Conventional Commits.
- Fast-forward `main` only if remote state is unchanged, push, and verify GitHub Pages and
  Railway deploy the final commit successfully.
- Test production health, CORS, PDF analysis and JSON export. Report actual results and any
  remaining limitations; do not claim future 14-day uptime has already been verified.
