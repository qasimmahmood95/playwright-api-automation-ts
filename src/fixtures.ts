import { test as base, expect } from '@playwright/test';
import { AuthClient } from './clients/auth.client';
import { BookingClient, tokenAuth } from './clients/booking.client';
import { Booking, CreateBookingResponse } from './schemas/booking.schema';
import { TokenResponseSchema } from './schemas/auth.schema';
import { buildBooking, fakerSeed } from './data/booking.factory';
import { env } from './config/env';

export interface TestBooking extends CreateBookingResponse {
  /** The payload sent to the API — assert round-trips against this. */
  requested: Booking;
}

/** Creates a booking (tracked for teardown cleanup) and returns it with its request payload. */
export type CreateTestBooking = (overrides?: Partial<Booking>) => Promise<TestBooking>;

interface TestFixtures {
  authClient: AuthClient;
  bookingClient: BookingClient;
  createTestBooking: CreateTestBooking;
  annotateFakerSeed: void;
}

interface WorkerFixtures {
  authToken: string;
}

/**
 * Framework rule: test-scoped code always talks to the API through the injected
 * `request` fixture (traceable, auto-disposed, config-aware) — clients are thin
 * typed wrappers around it. Worker-scoped fixtures are the one legitimate place
 * to create an APIRequestContext by hand, because a worker fixture cannot consume
 * the test-scoped `request` fixture; they pass baseURL explicitly and dispose in
 * teardown. See docs/adr/0001-fixtures-over-page-objects.md.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  authClient: async ({ request }, use) => {
    await use(new AuthClient(request));
  },

  bookingClient: async ({ request }, use) => {
    await use(new BookingClient(request));
  },

  // Auto fixture: every test records the faker seed it ran with, so any
  // failure is reproducible with `FAKER_SEED=<seed> npm test`.
  annotateFakerSeed: [
    // eslint-disable-next-line no-empty-pattern
    async ({}, use, testInfo) => {
      testInfo.annotations.push({ type: 'faker-seed', description: String(fakerSeed) });
      await use();
    },
    { auto: true },
  ],

  // One /auth round-trip per worker instead of one per test; only tests that
  // declare `authToken` pay for it at all.
  authToken: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext({ baseURL: env.baseURL });
      const response = await context.post('/auth', {
        data: { username: env.username, password: env.password },
      });
      expect(response.status(), 'worker auth token request should succeed').toBe(200);
      const body: unknown = await response.json();
      await context.dispose();
      await use(TokenResponseSchema.parse(body).token);
    },
    { scope: 'worker' },
  ],

  // Data-lifecycle hygiene: every booking created through this factory is
  // best-effort deleted in teardown, even when the test fails.
  createTestBooking: async ({ bookingClient, authToken }, use) => {
    const createdIds: number[] = [];
    await use(async (overrides: Partial<Booking> = {}) => {
      const requested = buildBooking(overrides);
      const created = await bookingClient.createBooking(requested);
      createdIds.push(created.bookingid);
      return { ...created, requested };
    });
    for (const id of createdIds) {
      await bookingClient.deleteBooking(id, tokenAuth(authToken)).catch(() => {});
    }
  },
});

export { expect };
