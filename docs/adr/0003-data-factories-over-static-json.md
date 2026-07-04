# ADR-0003: faker data factories instead of static JSON test data

Date: 2026-07-04 · Status: Accepted

## Context

Test data was eight static JSON files: every run by every visitor created an
identical booking (the author's own name), the hardcoded `checkin: 2024-01-01`
drifted years into the past — semantically invalid for a _booking_ API — and
JSON imports carried no type checking. On a shared public API, identical
static data also makes lookup-by-content ambiguous and filter tests
impossible.

## Decision

- `src/data/booking.factory.ts` builds valid bookings with
  **@faker-js/faker**: unique names, future dates (checkout computed strictly
  after checkin), and a `Partial<Booking>` overrides parameter. The return
  type is the zod-inferred `Booking`, so factory drift from the contract is a
  compile error.
- **Reproducibility:** the seed is `FAKER_SEED` if set, else `Date.now()`;
  an auto fixture annotates every test with the seed in use, so any failure
  replays exactly with `FAKER_SEED=<seed> npm test`.
- **Invalid payloads** are named, typed constants in
  `src/data/invalid-bookings.ts`, built as broken variants of factory output.
  Each carries a comment naming the violated contract rule — self-documenting
  in a way an opaque JSON file is not.
- `test-data/` is deleted entirely, including the committed credentials file:
  credentials now come from `src/config/env.ts` (documented public demo
  values by default, overridable via environment).

## Consequences

- Unique data per run: no collisions with other users of the shared API, and
  deterministic name-based filter tests become possible.
- One source of truth (schema → type → factory → test) enforced by the
  compiler.
