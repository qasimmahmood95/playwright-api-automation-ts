# Test Strategy

Scope: black-box functional and contract testing of the public
[restful-booker](https://restful-booker.herokuapp.com/apidoc/index.html) HTTP
API via Playwright's `APIRequestContext`. No UI, no load testing (see
[Deliberate exclusions](#deliberate-exclusions)).

## Coverage matrix

| Endpoint               | Happy path     | Contract (zod) | Negative                                            | Auth modes                |
| ---------------------- | -------------- | -------------- | --------------------------------------------------- | ------------------------- |
| `GET /ping`            | ✅ @smoke      | n/a (text)     | —                                                   | none required             |
| `POST /auth`           | ✅ @smoke      | ✅             | bad credentials (200-quirk)                         | n/a                       |
| `GET /booking`         | ✅             | ✅             | —                                                   | none required             |
| `GET /booking?name`    | ✅             | ✅             | —                                                   | none required             |
| `GET /booking?date`    | 🟡 @quarantine | ✅             | —                                                   | none required             |
| `GET /booking/{id}`    | ✅ @smoke      | ✅             | nonexistent id → 404; XML + JSON content types      | none required             |
| `POST /booking`        | ✅ @smoke      | ✅             | 3 invalid-payload cases (500-quirk)                 | none required             |
| `PUT /booking/{id}`    | ✅             | ✅             | invalid token / no auth → 403; nonexistent id → 405 | Cookie token ✅, Basic ✅ |
| `PATCH /booking/{id}`  | ✅             | ✅             | invalid token / no auth → 403; nonexistent id → 405 | Cookie token ✅, Basic ✅ |
| `DELETE /booking/{id}` | ✅             | n/a            | invalid token / no auth → 403; nonexistent id → 405 | Cookie token ✅, Basic ✅ |

Tags: `@smoke` (4 tests — fast PR signal), `@regression`, `@negative`,
`@quarantine` (excluded from CI via `test:ci`).

## Known API defect register

restful-booker is intentionally defective; the suite asserts the _actual_
behavior and annotates the deviation (`api-quirk` annotations render in the
HTML report):

| #   | Behavior                                        | Actual                                    | Conventional | Status                                        |
| --- | ----------------------------------------------- | ----------------------------------------- | ------------ | --------------------------------------------- |
| 1   | `GET /ping` health signal                       | `201 Created`                             | `200 OK`     | asserted + annotated                          |
| 2   | `DELETE /booking/{id}` success                  | `201 Created`                             | `200`/`204`  | asserted + annotated                          |
| 3   | Create-booking validation failure               | `500`                                     | `400`        | asserted + annotated (3 payload variants)     |
| 4   | Failed auth `POST /auth`                        | `200` + `{reason: "Bad credentials"}`     | `401`        | asserted + annotated                          |
| 5   | PUT/PATCH/DELETE on nonexistent id (valid auth) | `405`                                     | `404`        | asserted + annotated                          |
| 6   | `checkin` date filter                           | reported off-by-one (`>` instead of `>=`) | `>=`         | **quarantined** pending live-API verification |

## Flakiness strategy

The live target is a free Heroku dyno shared with strangers: cold starts,
occasional 5xx, and concurrent mutation of the same data store. The policy:

1. **Retries are CI-only** (`retries: process.env.CI ? 2 : 0`) and exist for
   the environment, not the code. Locally, failures fail immediately.
2. **One retry mechanism.** There is deliberately no bespoke
   retry-on-502 wrapper — two retry layers silently masking real flakiness is
   worse than one visible one.
3. **Every test owns its data.** Mutating tests create their booking through
   the factory fixture (faker-unique, deleted in teardown). Nothing depends on
   pre-existing ids or data another user could change.
4. **2 workers on CI** — a polite tenant on a shared public API.
5. **Quarantine lane:** a test whose expected behavior is unverified or known-unstable
   is tagged `@quarantine` and excluded from CI (`--grep-invert`), never
   deleted or skipped silently. Rehab requires demonstrating stable behavior
   against the live API, then removing the tag.

## CI design

- **Staged pipeline** (`ci.yml`): quality gates (lint, typecheck, format —
  the same `npm run check` developers run locally, so local and CI can't
  drift) gate the test job.
- **No browser install** — the suite uses `APIRequestContext` only; the stock
  Playwright workflow's ~1 GB browser download is deliberately absent.
- **Concurrency:** superseded PR runs are cancelled; main keeps complete
  history. Scheduled runs have no concurrency group at all.
- **Artifacts:** PR reports upload only on failure (7 days — a green PR
  report has no audience); nightly reports always upload (30 days — the
  failure-trend record); the latest main report publishes to GitHub Pages.
- **Nightly canary** (`nightly.yml`): daily run against the live API that
  files or updates a `nightly-failure` issue on failure. The suite doubles as
  API monitoring.
- **Dependencies:** dependabot updates npm (minor/patch grouped weekly) and
  GitHub Actions. Actions are pinned to version tags; commit-SHA pinning is a
  planned hardening step.
- **Secrets:** none. The demo credentials are restful-booker's publicly
  documented values and default in code; in a real project they would come
  from repo secrets — the env plumbing (`src/config/env.ts`, exercised via
  `BASE_URL`) is the pattern.

## Deliberate exclusions

Knowing what _not_ to build is part of the strategy:

| Excluded                                    | Why                                                                                                                                                       |
| ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cucumber/BDD layer                          | Indirection with no stakeholder to read Gherkin.                                                                                                          |
| HTTP-client abstraction beyond thin clients | Playwright's `request` fixture already handles baseURL, tracing, disposal — the deleted `Common` class is this repo's own cautionary tale (see ADR-0001). |
| Pact / contract broker                      | No consumer–provider pair exists; zod schema checks are the right-sized contract test for a black-box public API.                                         |
| Custom retry wrapper                        | See flakiness strategy: one retry mechanism, visible.                                                                                                     |
| GitHub Secrets for demo creds               | Secrets machinery for publicly documented demo values is cargo-culting; the env-var pattern is demonstrated instead.                                      |
| Docker                                      | Nothing to containerize for a hosted API; a compose-based hermetic mode is on the roadmap for its own sake (derisking the shared dyno), not for CI.       |
| Node-version matrix                         | A test suite ships to no runtime; one pinned version (`.nvmrc`) is the discipline that matters.                                                           |
| k6 / load testing                           | Abusive and meaningless against a shared public demo API.                                                                                                 |
| Allure                                      | Playwright's HTML report, published to Pages, suffices.                                                                                                   |
| Response-time assertions                    | Noise against a free dyno the suite would have to apologize for.                                                                                          |

## Verification status

Assertions in this suite were developed against a local mock implementing the
API's documented semantics (the authoring environment could not reach the
live API). The standing acceptance gate before any merge to main: the full
suite runs green **against the live API** in CI, and any behavior asserted
for the first time (the 405 semantics, XML content types, filter behavior) is
confirmed there. The checkin-filter test stays quarantined until verified.
