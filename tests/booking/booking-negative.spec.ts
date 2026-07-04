import { APIResponse } from '@playwright/test';
import { expect, test } from '../../src/fixtures';
import { buildBooking } from '../../src/data/booking.factory';
import { BookingAuth, BookingClient, noAuth, tokenAuth } from '../../src/clients/booking.client';
import {
  bookingMissingCheckout,
  bookingWithMalformedDates,
  bookingWithNumericName,
} from '../../src/data/invalid-bookings';

test.describe('Booking validation', () => {
  const invalidPayloadCases = [
    {
      name: 'numeric name',
      payload: bookingWithNumericName,
      violates: 'firstname/lastname must be strings',
    },
    {
      name: 'malformed dates',
      payload: bookingWithMalformedDates,
      violates: 'bookingdates must be an object of {checkin, checkout}',
    },
    {
      name: 'missing checkout date',
      payload: bookingMissingCheckout,
      violates: 'bookingdates.checkout is required',
    },
  ];

  for (const invalid of invalidPayloadCases) {
    test(
      `Rejects a booking with ${invalid.name}`,
      { tag: ['@negative'] },
      async ({ bookingClient }) => {
        test.info().annotations.push({
          type: 'api-quirk',
          description: `validation failures return 500 instead of 400 (violated rule: ${invalid.violates})`,
        });
        const response = await bookingClient.createBookingRaw(invalid.payload);
        // restful-booker quirk: validation failures return 500 (correct would be 400) — documented API defect
        expect(response.status()).toBe(500);
      }
    );
  }
});

const mutatingMethods = ['PUT', 'PATCH', 'DELETE'] as const;
type MutatingMethod = (typeof mutatingMethods)[number];

function attemptMutation(
  client: BookingClient,
  id: number,
  method: MutatingMethod,
  auth: BookingAuth
): Promise<APIResponse> {
  switch (method) {
    case 'PUT':
      return client.updateBookingRaw(id, buildBooking(), auth);
    case 'PATCH':
      return client.partialUpdateBookingRaw(id, { totalprice: 1 }, auth);
    case 'DELETE':
      return client.deleteBooking(id, auth);
  }
}

test.describe('Booking auth failures', () => {
  for (const method of mutatingMethods) {
    test(
      `Rejects ${method} with an invalid token`,
      { tag: ['@negative'] },
      async ({ bookingClient, createTestBooking }) => {
        // Each test owns its resource — no dependency on booking id 1 existing on the shared API.
        const { bookingid } = await createTestBooking();

        const response = await attemptMutation(
          bookingClient,
          bookingid,
          method,
          tokenAuth('not-a-real-token')
        );
        expect(response.status()).toBe(403);
      }
    );

    test(
      `Rejects ${method} with no auth at all`,
      { tag: ['@negative'] },
      async ({ bookingClient, createTestBooking }) => {
        const { bookingid } = await createTestBooking();

        const response = await attemptMutation(bookingClient, bookingid, method, noAuth);
        expect(response.status()).toBe(403);
      }
    );
  }
});

test.describe('Nonexistent booking semantics', () => {
  const NONEXISTENT_ID = 999_999_999;

  test(
    'Returns 404 for GET on a nonexistent booking',
    { tag: ['@negative'] },
    async ({ bookingClient }) => {
      const response = await bookingClient.getBookingRaw(NONEXISTENT_ID);
      expect(response.status()).toBe(404);
    }
  );

  for (const method of mutatingMethods) {
    test(
      `Returns 405 for ${method} on a nonexistent booking with valid auth`,
      { tag: ['@negative'] },
      async ({ bookingClient, authToken }) => {
        test.info().annotations.push({
          type: 'api-quirk',
          description:
            'mutations on a nonexistent id return 405 Method Not Allowed — 404 would be conventional',
        });
        const response = await attemptMutation(
          bookingClient,
          NONEXISTENT_ID,
          method,
          tokenAuth(authToken)
        );
        // restful-booker quirk: mutating a nonexistent booking yields 405, not 404
        expect(response.status()).toBe(405);
      }
    );
  }
});
