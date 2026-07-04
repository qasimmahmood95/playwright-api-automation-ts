# ADR-0001: Fixtures + typed API clients instead of Page Objects for API testing

Date: 2026-07-04 · Status: Accepted

## Context

The suite originally used a `pages/common.page.ts` class — Page Object Model
vocabulary applied to an API project. Beyond the naming, the class carried real
defects:

1. `validateSuccessStatus` was `async` but never awaited at any of its ~10 call
   sites — a floating promise whose assertions only failed tests by luck,
   because the `expect()` calls inside happened to be synchronous.
2. `createToken()`/`createNewBooking()` each created their own
   `request.newContext()` and never disposed it — two leaked contexts per test
   via the `beforeEach`, and calls that bypass the test's `request` fixture do
   not appear in traces.
3. Credentials were typed `any`, and a fresh auth token was minted before
   _every_ test although only 3 of 13 tests used one.

(Nuance, verified empirically: inside a test worker, Playwright applies the
config `use` options to library-level `request.newContext()`, so the relative
URLs did resolve against `baseURL`. The same code throws `Invalid URL` outside
the runner. The refactor is not about a broken baseURL — it is about the
defects above and about not depending on that undocumented injection.)

## Decision

- Thin **typed API clients** (`src/clients/*.client.ts`) wrap the endpoints.
  They receive the test's own `APIRequestContext` — the injected `request`
  fixture — so calls inherit `baseURL`, participate in traces, and are disposed
  automatically. Happy-path methods assert the expected status and return
  parsed, typed bodies; `*Raw` variants make no assertions for negative tests.
- **Custom fixtures** (`src/fixtures.ts`) compose them: test-scoped clients, a
  **worker-scoped `authToken`** (one `/auth` round-trip per worker, paid only
  by tests that declare it), and a `createTestBooking` factory that tracks and
  best-effort deletes created bookings in teardown.
- **The context rule:** test-scoped code always uses the injected `request`
  fixture. Worker-scoped fixtures are the one legitimate place to create a
  context by hand (a worker fixture cannot consume the test-scoped `request`
  fixture) — they must pass `baseURL` explicitly from `src/config/env.ts` and
  dispose the context in teardown.
- Assertion helpers are synchronous, and `@typescript-eslint/no-floating-promises`
  (type-aware) is an error — the original bug class cannot come back unnoticed.

## Consequences

- Tests read as business steps (`createTestBooking()`, `updateBooking(...)`)
  and declare exactly the dependencies they use.
- No hand-managed contexts in test code; nothing leaks; all traffic is traced.
- The `pages/` directory is gone; API test code no longer borrows UI-pattern
  vocabulary it doesn't need.
