# Production-Readiness Improvement Plan

**Goal:** make this repo a production-grade Playwright + TypeScript API automation framework that reads as senior-SDET work in a 5-minute hiring-manager screen — and holds up in a deep code review afterwards.

**How to use this document:** Part 1 is the honest current-state assessment (every claim verified against the code, the live-API behavior, or the GitHub Actions history). Part 2 fixes the target architecture decisions once, so later work doesn't churn. Part 3 is the execution plan — seven PRs in dependency order, each independently shippable. Part 4 lists what we deliberately will **not** build, with reasons (knowing what to skip is part of the portfolio). Part 5 is the definition of done.

---

## Part 1 — Current-state assessment (verified)

### 1.1 What actually breaks today

| #   | Finding                                                                                                                                                                                                                                                                                                                                                                               | Evidence                                                                                                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| 1   | **`npm test` fails on a fresh clone** — `"scripts": {}` is empty. There is no documented way to run, lint, or check anything.                                                                                                                                                                                                                                                         | `package.json`                                                                                          |
| 2   | **CI has never run once.** The GitHub Actions API reports zero workflow runs for this repo, so the README badge has never been green (and it uses the deprecated `workflows/<name>/badge.svg` URL format).                                                                                                                                                                            | GitHub Actions API: `total_count: 0`                                                                    |
| 3   | **No `tsconfig.json`, and `typescript` is not a dependency** — in a repo named `-ts`. TypeScript exists only as an undeclared transitive dep of `typescript-eslint`. There is no typecheck anywhere. (Good news, verified: the current code already passes `tsc --noEmit` under full strict flags, so adding the gate is zero-migration-cost.)                                        | repo root; `npm ls typescript`                                                                          |
| 4   | **The repo fails its own linter with 5 errors** — `globals.browser` is configured for a Node-only project (which is why `.prettierrc.js` errors with `'module' is not defined`), plus `no-explicit-any` and 3× `no-empty-pattern`. Nothing runs ESLint, so nobody noticed.                                                                                                            | `npx eslint .`                                                                                          |
| 5   | **Prettier is configured but not installed** — `.prettierrc.js` exists, `prettier` is not in `devDependencies`, there is no format script, and `.prettierignore` excludes all YAML (i.e. the one CI file).                                                                                                                                                                            | `package.json`, `.prettierignore`                                                                       |
| 6   | **`validateSuccessStatus` is `async` and never awaited at any of its ~10 call sites** — a floating promise that only works because the `expect()` calls inside happen to be synchronous. The moment anyone adds an async assertion, failures stop failing tests. Worse, in `positive.test.ts` the token is parsed from the body (line 15) _before_ the status is validated (line 16). | `pages/common.page.ts:5`, `tests/positive.test.ts:16,21,26,31,40,52,64,75`, `tests/negative.test.ts:33` |
| 7   | **Every test leaks undisposed `APIRequestContext`s** — `createToken()`/`createNewBooking()` each create a context and never dispose it; the `beforeEach` mints a fresh auth token before **every** test although only 3 of 13 tests need one. Calls made through these rogue contexts also bypass the test's `request` fixture, so they don't appear in traces.                       | `pages/common.page.ts:11,22`, `tests/positive.test.ts:12-17`                                            |
| 8   | **`async` `test.describe` callbacks** — a documented anti-pattern that newer Playwright versions reject outright, so the (already ~year-stale) `@playwright/test@1.46` upgrade will hard-fail until fixed.                                                                                                                                                                            | `tests/positive.test.ts:8`, `tests/negative.test.ts:9`                                                  |
| 9   | **`playwright.config.ts` contradicts itself** — `retries: 2` sits under a comment saying "Retry on CI only" (local failures silently rerun 3×, masking flake during development); `workers: 3` is hardcoded; the `api-tests` project has an empty `use: {}`; the reporter is `html` only (no console/PR output).                                                                      | `playwright.config.ts:10-12,26`                                                                         |
| 10  | **Test data is stale and collision-prone** — static JSON with the author's own name in every booking and `checkin: 2024-01-01` (2.5 years in the past for a _booking_ API); `test-data/valid/token_auth_credentials.json` commits credentials (they're the API's documented public demo creds, but a screener sees "creds in git" before the footnote).                               | `test-data/`                                                                                            |

### 1.2 What a hiring manager sees in the first 5 minutes

- A 3-line README with a dead badge → closes the tab in 30 seconds.
- A `pages/` folder with `.page.ts` files **in an API project** → Page Object Model vocabulary misapplied, reads as a UI habit cargo-culted onto API testing.
- The stock, unmodified Playwright scaffold workflow, including `npx playwright install --with-deps` — downloading ~1 GB of browsers for a suite that never opens a page.
- Shallow assertions (one `toHaveProperty` per test; `Get Booking IDs` asserts nothing about the body).
- Quirky status assertions (`/ping` → 201, DELETE → 201, validation errors → 500, bad credentials → 200) **with no comment** — reads as "doesn't know HTTP" instead of "documented a defective API".
- Two commits ("Initial commit", "Create README.md"), no PRs, no releases, no LICENSE file (package.json says ISC with nothing backing it).

### 1.3 One important technical correction (so we don't ship a false claim)

Inside a Playwright test worker, the library-level `request.newContext()` **does** inherit the config's `use` options (verified empirically on 1.46.1: a probe resolved relative `/ping` against the config `baseURL`). The same code throws `Invalid URL` outside the runner (also verified). So the `Common` class is not "broken by construction" — its real defects are the floating assertions, the leaked contexts, the `any` types, the per-test token, and trace invisibility. **The ADR and README we write must use the correct rationale.** An interviewer who knows Playwright would catch the wrong one.

A related anecdote worth keeping: when this suite was run in a sandbox whose egress proxy blocks the API, the two invalid-token tests **passed spuriously** — the proxy itself returned 403, which is exactly what the tests assert. That's a ready-made interview story about why status-code-only assertions are weak, and it motivates the schema-validation work in PR4.

---

## Part 2 — Target architecture (decided once, here)

### 2.1 Canonical layout

```
src/
  clients/
    auth.client.ts        # createToken(credentials): Promise<string>
    booking.client.ts     # getBookingIds(filters?), getBooking(id), createBooking(payload),
                          # updateBooking(id, payload, auth), partialUpdateBooking(...), deleteBooking(...)
  schemas/
    booking.schema.ts     # zod: BookingSchema, CreateBookingResponseSchema, BookingIdsSchema
    auth.schema.ts        # zod: TokenResponseSchema
  data/
    booking.factory.ts    # faker builders with Partial<Booking> overrides, seeded + seed logged
    invalid-bookings.ts   # typed broken variants, each commented with the violated rule
  config/
    env.ts                # BASE_URL / BOOKER_USERNAME / BOOKER_PASSWORD with documented public defaults
  fixtures.ts             # test.extend: bookingClient, authClient, bookingFactory (auto-cleanup),
                          # worker-scoped authToken
tests/
  health/ping.spec.ts
  auth/auth.spec.ts
  booking/
    booking-crud.spec.ts
    booking-filters.spec.ts
    booking-auth-modes.spec.ts
    booking-negative.spec.ts
docs/
  TEST-STRATEGY.md        # coverage matrix, known-API-defects register, flakiness strategy, CI design
  adr/
    0001-fixtures-over-page-objects.md
    0002-zod-schema-validation.md
    0003-data-factories-over-static-json.md
```

Deliberate simplifications (decided, don't relitigate): **no** `base.client.ts` abstract parent (two clients don't justify a hierarchy); **no** tsconfig path aliases (relative imports are fine at this size); **single** `src/fixtures.ts` file (too small for a `fixtures/` directory); test files are `*.spec.ts`, grouped by resource, not by positive/negative; tsconfig uses plain CommonJS module resolution (verified working with strict mode; the NodeNext-vs-bundler debate is noise for a test-only repo).

### 2.2 Key design rules

1. **Test-scoped code always uses the injected `request` fixture** (traceable, auto-disposed, config-aware). **Worker-scoped fixtures are the one legitimate place** to create a context — they must pass `baseURL` from `src/config/env.ts` explicitly and dispose in teardown. (This precise phrasing goes in ADR-0001; the absolute version "never call `request.newContext()`" would be violated by our own `authToken` fixture.)
2. **Clients return parsed, schema-validated, typed DTOs** — `schema.parse(await res.json())` — so every test transparently validates the full contract, and `z.infer<>` gives one source of truth for types, factories, and assertions.
3. **Assertion helpers are synchronous** (they take an already-resolved `APIResponse`), and `@typescript-eslint/no-floating-promises` + `eslint-plugin-playwright` make the original bug class impossible to reintroduce.
4. **Every API quirk asserted gets an inline comment + report annotation** (`// restful-booker quirk: DELETE returns 201 (correct: 200/204) — documented API defect`). The full register lives in `docs/TEST-STRATEGY.md`.
5. **Zero-config quickstart wins:** `git clone → npm ci → npm test` must work with no `.env` step. Env vars override documented public defaults; no GitHub Secrets machinery for public demo creds (one README sentence explains where secrets would go in a real project).
6. **Workers: 2 in CI** with a comment ("shared public API — be a polite tenant"); `retries: process.env.CI ? 2 : 0` with a comment explaining that retries exist for the free Heroku dyno, not for masking bugs.

---

## Part 3 — Execution: seven PRs, in order

Do the work as small conventional-commit PRs into `main`. The PR history itself is a portfolio artifact — it can't be faked in an afternoon and hiring managers do click the commits tab. Set `"version": "0.1.0"` in PR1 and tag `v1.0.0` only at the end.

> **Standing acceptance gate for every PR:** fresh `npm ci && npm test` green against the live API, CI green on the PR, and any newly asserted API behavior re-verified against the real API before merge (this sandbox cannot reach it — see Part 5).

### PR1 — `chore: make the repo runnable and honest` (foundation + quick wins) — ~2h

The two highest-signal-per-minute fixes ship here, before anything big, so the repo is de-risked even if later work stalls.

- `package.json`: full scripts block — `test`, `test:smoke`, `lint`, `lint:fix`, `format`, `format:check`, `typecheck`, `check` (aggregate: typecheck && lint && format:check), `report`. Fill description, author, keywords, `repository`; license → MIT + LICENSE file; `engines: { node: ">=20" }`; remove `"main": "index.js"`; version → 0.1.0. Add `.nvmrc`.
- `tsconfig.json`: strict: true, noUncheckedIndexedAccess, noImplicitOverride, noUnusedLocals/Parameters, resolveJsonModule (tests import JSON until PR4), noEmit, types: ["node"]. Verified: current code already passes.
- Install `typescript` + `prettier`; replace `.prettierrc.js` with `.prettierrc.json` (kills a lint error; use `endOfLine: "lf"`); rewrite `.prettierignore` to `package-lock.json`, `playwright-report/`, `test-results/` (un-ignore YAML); run `npm run format` once and commit the diff.
- **Quirk comments** at every odd status assertion: `/ping` → 201, DELETE → 201, 3× validation → 500, bad-creds → 200 (`positive.test.ts`, `negative.test.ts`). Fifteen minutes that flips the single most damaging impression.
- **Delete the CI browser-install step** (`playwright.yml` lines 18–19) with the comment: `# API-only suite: APIRequestContext needs no browsers`. Best interview talking point in the plan.
- `.gitignore`: add `.env`.

### PR2 — `fix(lint): type-aware ESLint + fix the floating-assertion bug` — ~2h

The narrative PR: "my new lint rule caught my own bug" is interview gold.

- `eslint.config.mjs`: `globals.node`; `ignores` for report/output dirs; `tseslint.configs.recommendedTypeChecked` with `projectService: true` (+ `disableTypeChecked` for `*.mjs`); `@typescript-eslint/no-floating-promises`, `no-misused-promises`, `await-thenable` as errors; `eslint-plugin-playwright` flat/recommended over `tests/**`; `eslint-config-prettier` last.
- Fix everything it flags: make the assertion helper **synchronous**, reorder the beforeEach to validate status _before_ parsing the body, remove `async` from both describe callbacks, type the `any` credential param, fix the empty-pattern fixtures, rename the copy-pasted `updateBooking` variable in the DELETE test (`negative.test.ts:47`).
- Upgrade `@playwright/test` to latest 1.5x **in this PR** (the async-describe fix unblocks it; doing it before the refactor means behavior changes surface against known-good tests).
- Commit message for the core fix: `fix(assertions): await-safety — make status assertion sync; it was async and never awaited at 10 call sites`.

### PR3 — `refactor: typed clients + fixtures; delete pages/` — ~4h

The architecture centerpiece. Implements the Part 2 layout: `src/clients/`, `src/fixtures.ts`, `src/config/env.ts`.

- `AuthClient`/`BookingClient` wrap the **injected** `APIRequestContext`; no `new Context` in test-scoped code; typed params/returns everywhere.
- Fixtures: `bookingClient`/`authClient` (test-scoped, built on the `request` fixture); `authToken` (worker-scoped — one `/auth` call per worker instead of one per test; creates its own context with explicit baseURL, disposes in teardown); `bookingFactory` (creates bookings, tracks IDs, best-effort DELETE in teardown — fixes "tests never clean up").
- Tests import `{ test, expect }` from `../src/fixtures`; delete the `console.log` beforeEach blocks and describe-scope shared state; kill the hardcoded `/booking/1` dependency (each negative test creates its own booking).
- Delete `pages/` entirely. Write **ADR-0001: Fixtures over Page Objects for API testing** using the _correct_ rationale from Part 1.3 and the precise context rule from Part 2.2. Showing you replaced your own anti-pattern is a stronger senior signal than never having had it.

### PR4 — `feat: zod contract validation + faker data factories` — ~4h

- `zod` schemas per Part 2.1; clients return `schema.parse(...)`; replace single-property checks with full round-trip assertions (`expect(body.booking).toEqual(payload)`; `Get Booking IDs` asserts a nonempty array of `{bookingid: number}`).
- `@faker-js/faker` factory with `Partial<Booking>` overrides; checkin/checkout computed as _future_ dates (checkin < checkout); seed from `FAKER_SEED ?? Date.now()`, logged via `testInfo.annotations` so any failure reproduces exactly.
- `src/config/env.ts`: `BASE_URL`/`BOOKER_USERNAME`/`BOOKER_PASSWORD` with the documented public defaults in code (with the "these are the API's published demo creds" comment); optional `.env` via dotenv; `.env.example` committed. **No GitHub Secrets** (see Part 4).
- **Delete `test-data/` entirely.** Invalid payloads become typed constants in `src/data/invalid-bookings.ts` — e.g. `firstname: 123 as unknown as string` with a one-line comment naming the violated rule and the expected (quirky) 500.
- ADR-0002 (why zod over ajv: TS-first, one schema = validator + static type; ajv only wins with an existing JSON-Schema contract) and ADR-0003 (factories over static JSON: uniqueness on a shared API, type safety, reproducibility via seed).

### PR5 — `ci: staged pipeline, nightly monitoring, report publishing` — ~4h

- Rename to `ci.yml`, title "CI". Two jobs: **quality** (lint + typecheck + format:check via the npm scripts — never raw npx, so local `npm run check` and CI can't drift) → **test** (`needs: quality`). Timeout 10–15 min, not 60.
- `cache: 'npm'` on setup-node (+ `node-version-file: .nvmrc`); `concurrency` group with `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`; top-level `permissions: contents: read`; pin all actions to full commit SHAs with `# vX.Y.Z` comments.
- Artifacts: upload report `if: failure()` with `retention-days: 7` on PRs; YAML comment explaining the policy.
- **Separate `nightly.yml`** (schedule cron + `workflow_dispatch`, no concurrency group, `retention-days: 30`, `issues: write`): runs the full suite against the live API; on failure, comments on an existing open `nightly-failure` issue or creates one. This turns the repo into _API monitoring_ and keeps the Actions tab green while you're not committing. Note: GitHub disables cron on inactive repos after 60 days — a manual dispatch resets it.
- Publish the HTML report to **GitHub Pages** on main (`configure-pages`/`upload-pages-artifact`/`deploy-pages`, `pages: write` + `id-token: write`, `concurrency: pages`); enable Pages (Source: GitHub Actions) in repo settings. A hiring manager will not unzip an artifact; they **will** click "Latest test report".
- `.github/dependabot.yml`: npm + github-actions ecosystems, weekly, minor/patch grouped. Merge the first dependabot PR when it arrives — living proof the maintenance loop works.

### PR6 — `test: cover the other half of the API surface + tags` — ~6h (largest single item)

- `booking-filters.spec.ts`: GET `/booking?firstname=&lastname=` using faker-unique names (create → filter → find); date-filter test with an annotation if the live API's known checkin-filter off-by-one reproduces (**verify against the live API first** — documenting a _verified_ upstream bug is a strong signal; documenting a rumored one is not).
- `booking-auth-modes.spec.ts`: PUT/PATCH/DELETE × {Cookie token, `Authorization: Basic`} — proving both documented auth channels.
- Negative suite as a **data-driven table** (`{name, payload, expectedStatus, quirk?}` looped over `test()`), each quirk pushed to `testInfo.annotations` so it renders in the HTML report.
- Edge semantics (verify each against the live API before asserting): GET nonexistent id → 404; PUT/DELETE nonexistent id with valid auth → 405; XML content negotiation (`Accept: application/xml`) with content-type header assertions.
- Tags via the native `{ tag: ['@smoke'] }` option (works on 1.42+; no upgrade dependency): `/ping` + create/get round-trip + auth = `@smoke`; the rest `@regression`/`@negative`/`@contract`; `@quarantine` convention excluded via `--grep-invert` in CI. `test.step()` for multi-phase tests.
- `playwright.config.ts` final pass: CI-aware retries/workers per Part 2.2, reporters `[['list'], ['github'], ['html', {open:'never'}]]` on CI, `expect: { timeout: 10_000 }`, `extraHTTPHeaders: { Accept: 'application/json' }`, baseURL from `env.ts`, delete the empty project block, replace every scaffold comment with a real rationale.

### PR7 — `docs: README as the front door + TEST-STRATEGY + governance` — ~3h

- **README (~120–150 lines max, dense beats exhaustive):** modern badge row (CI, Nightly, Pages report link, Node, license); a 2–3 sentence "what this demonstrates" paragraph; zero-config quickstart (clone → `npm ci` → `npm test`, and _why_ there's no browser install); small Mermaid diagram (tests → fixtures → clients → schemas → API); npm-scripts table; a 4-row teaser of the known-API-defects table linking to the full register; Design Decisions links to the 3 ADRs; roadmap.
- **`docs/TEST-STRATEGY.md`:** full endpoint × method × case coverage matrix; complete known-API-defects register (each verified); flakiness strategy (CI-only retries + quarantine lane + per-test data isolation — and why there is deliberately **no** bespoke retry wrapper); CI design rationale (absorbed here instead of a fourth ADR); scope limits (Part 4 contents).
- Governance: `.github/PULL_REQUEST_TEMPLATE.md` (What/Why/How verified/checklist); short honest `CONTRIBUTING.md` ("conventions I hold myself to": conventional commits, `npm run check` before pushing, PRs into protected main); `.editorconfig`.
- Repo settings pass (not committable, do via GitHub UI/API): branch protection on main requiring the quality+test checks; **About description, topics (`playwright`, `typescript`, `api-testing`, `test-automation`, `sdet`, `zod`, `github-actions`), website = Pages report URL, pin the repo on your profile.** The repo card is the first thing a hiring manager sees — polish the click, not just what's behind it. Retitle away from "Demo" while you're there.

### Release

Tag `v1.0.0` with GitHub Release notes summarizing the transformation (no standalone CHANGELOG — one release makes it filler). Optionally screenshot the Pages report into the README.

**Total effort: roughly 25 hours of focused work.** PR1+PR2 alone (~4h) remove every red flag a reviewer can find in five minutes; each subsequent PR is independently valuable.

---

## Part 4 — Deliberately NOT doing (write these into TEST-STRATEGY.md)

Over-engineering is the most common failure mode of SDET portfolio repos, and experienced reviewers screen for it. Each exclusion below gets one sentence in the docs — declining the wrong tool _with a reason_ demonstrates more seniority than adding it.

| Cut                                                                       | Why                                                                                                                                                                                             |
| ------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cucumber/BDD layer                                                        | Indirection with no stakeholder to read Gherkin.                                                                                                                                                |
| Custom HTTP-client abstraction beyond thin clients                        | Playwright's request fixture already does baseURL, tracing, disposal — the deleted `Common` class is the cautionary tale.                                                                       |
| Pact / contract broker                                                    | No consumer-provider pair exists; zod schema checks are the right-sized contract test.                                                                                                          |
| `requestWithRetry` helper                                                 | Stacked on Playwright's CI retries = two retry layers silently masking real flakiness — undermines our own flakiness narrative. Keep exactly one mechanism.                                     |
| GitHub Secrets for demo creds                                             | `admin/password123` are the API's published demo values; secrets theater for public data reads as cargo-culting. The env-var plumbing (exercised via `BASE_URL`) _is_ the demonstrated pattern. |
| Test-runner Dockerfile                                                    | Containerizing `npm ci && npx playwright test` for an API suite with zero OS deps demonstrates nothing.                                                                                         |
| Hermetic docker-compose mode (restful-booker image, `BASE_URL=localhost`) | Genuinely valuable but not now — **Roadmap bullet**; the env-driven baseURL makes it a one-variable switch later.                                                                               |
| CODEOWNERS                                                                | Assigning review to the only person who can push is process theater on a solo repo.                                                                                                             |
| Node-version matrix                                                       | A test suite that ships to no runtime proves nothing across Node versions; pin one version via `.nvmrc`.                                                                                        |
| Response-time budget assertions                                           | Noise against a free Heroku dyno that the docs would have to apologize for.                                                                                                                     |
| k6 / load testing                                                         | Abusive and meaningless against a shared public API.                                                                                                                                            |
| Allure                                                                    | Playwright's HTML report published to Pages suffices; one less server to explain.                                                                                                               |
| husky + lint-staged                                                       | Borderline; add only if `CONTRIBUTING.md` frames it honestly. CI is the backstop either way.                                                                                                    |

---

## Part 5 — Definition of done (run after every PR, and at the end)

1. **Fresh-clone check:** `rm -rf node_modules && npm ci && npm test` is green against the live API, from a network that can reach it. (Note: the authoring sandbox for this plan **cannot** reach `restful-booker.herokuapp.com` — its proxy blocks it, and even made two tests pass spuriously. Final verification must happen locally or in GitHub Actions, never assumed.)
2. **CI green** on the PR with the quality gates actually enforcing (lint clean, typecheck clean, format:check clean — PR1 pre-cleans all three so the first gated run is green, not red on its own history).
3. **Every asserted API quirk re-verified against the live API** before it's asserted or documented: DELETE→201, /ping→201, validation→500, bad-creds→200, GET-nonexistent→404, PUT/DELETE-nonexistent-with-auth→405, the checkin-filter bug. No rumored behavior in the docs.
4. **Docs tell one story:** README, TEST-STRATEGY.md, and the ADRs must not contradict each other (secrets stance, Docker stance, retry stance, fixture/context rule).
5. **The 5-minute screen passes:** repo card polished (About/topics/pin), badges green, quickstart works, first test file a reviewer opens has typed fixtures + commented quirks + schema-validated assertions, commits tab shows conventional-commit PRs, `v1.0.0` release exists.
