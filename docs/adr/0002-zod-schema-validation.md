# ADR-0002: zod for response contract validation

Date: 2026-07-04 · Status: Accepted

## Context

The original tests asserted a single property per response
(`toHaveProperty('firstname', ...)`) — a response with a mangled
`bookingdates` object, missing fields, or wrong types would still pass. A
memorable illustration: run behind a proxy that blocks the API, and the
proxy's own 403 satisfied the invalid-token tests. Status-code checks alone
are weak evidence.

We want every API call to validate the full response shape, without
maintaining types and validators separately.

## Decision

Use **zod**. Schemas live in `src/schemas/`; clients return
`Schema.parse(await response.json())`, so every happy-path call is a contract
check, and `z.infer<>` derives the static types — one definition serves as
runtime validator and compile-time type for clients, factories, and tests.

Why not the alternatives:

- **ajv** wins when a JSON Schema / OpenAPI contract already exists or raw
  throughput matters. restful-booker publishes neither, and test-suite volumes
  make performance irrelevant; ajv would mean separate schema files and
  generated types.
- **Pact / contract brokers** need a consumer–provider pair exchanging
  contracts. There is no consumer here; schema assertions are the right-sized
  contract test for a black-box public API.

## Consequences

- A response that drops or retypes any field fails loudly with a readable
  zod error naming the exact path.
- Test data cannot drift from the contract: factories return the
  schema-inferred `Booking` type, so drift is a compile error.
