import { test as base, expect } from '@playwright/test';
import { AuthClient, TokenResponse } from './clients/auth.client';
import { Booking, BookingClient, CreateBookingResponse } from './clients/booking.client';
import { env } from './config/env';
import userDetails from '../test-data/valid/user_details.json';

/** Creates a booking (tracked for teardown cleanup) and returns the API's response. */
export type CreateTestBooking = (overrides?: Partial<Booking>) => Promise<CreateBookingResponse>;

interface TestFixtures {
  authClient: AuthClient;
  bookingClient: BookingClient;
  createTestBooking: CreateTestBooking;
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

  // One /auth round-trip per worker instead of one per test; only tests that
  // declare `authToken` pay for it at all.
  authToken: [
    async ({ playwright }, use) => {
      const context = await playwright.request.newContext({ baseURL: env.baseURL });
      const response = await context.post('/auth', {
        data: { username: env.username, password: env.password },
      });
      expect(response.status(), 'worker auth token request should succeed').toBe(200);
      const body = (await response.json()) as Partial<TokenResponse>;
      await context.dispose();
      expect(body.token, 'auth response should contain a token').toBeTruthy();
      await use(body.token as string);
    },
    { scope: 'worker' },
  ],

  // Data-lifecycle hygiene: every booking created through this factory is
  // best-effort deleted in teardown, even when the test fails.
  createTestBooking: async ({ bookingClient, authToken }, use) => {
    const createdIds: number[] = [];
    await use(async (overrides: Partial<Booking> = {}) => {
      const created = await bookingClient.createBooking({ ...userDetails, ...overrides });
      createdIds.push(created.bookingid);
      return created;
    });
    for (const id of createdIds) {
      await bookingClient.deleteBooking(id, authToken).catch(() => {});
    }
  },
});

export { expect };
