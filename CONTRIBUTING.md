# Contributing

This is a solo portfolio project; these are the conventions I hold myself to
(and that CI enforces).

## Workflow

- `main` is protected: changes land via PR with green CI (quality gates +
  tests as required checks), no direct pushes.
- Commits follow [Conventional Commits](https://www.conventionalcommits.org/)
  (`feat:`, `fix:`, `refactor:`, `test:`, `ci:`, `docs:`, `chore:`).
- Before pushing: `npm run check` (typecheck + lint + format check — the same
  gate CI runs) and `npm test`.

## Conventions

- Tests import `{ test, expect }` from `src/fixtures.ts`, never from
  `@playwright/test` directly.
- Test-scoped code talks to the API only through the injected `request`
  fixture / clients (see ADR-0001 for the one worker-fixture exception).
- Any assertion of quirky API behavior gets an inline comment and an
  `api-quirk` annotation.
- Unstable or unverified tests are tagged `@quarantine` (excluded from CI),
  never silently skipped or deleted. Rehab = prove stability against the live
  API, remove the tag.
- New response shapes get a zod schema in `src/schemas/`; types are always
  `z.infer` — never hand-written duplicates.

## Setup

```bash
npm ci        # Node version: see .nvmrc
npm test      # zero config; see .env.example for optional overrides
```
