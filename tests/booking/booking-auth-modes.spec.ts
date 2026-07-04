import { expect, test } from '../../src/fixtures';
import { buildBooking } from '../../src/data/booking.factory';
import { basicAuth, BookingAuth, tokenAuth } from '../../src/clients/booking.client';
import { env } from '../../src/config/env';

/**
 * restful-booker documents two interchangeable auth channels for mutations:
 * the Cookie token from POST /auth, and HTTP Basic. Every mutating verb must
 * accept both.
 */
const authModes = ['cookie-token', 'basic'] as const;
type AuthMode = (typeof authModes)[number];

function resolveAuth(mode: AuthMode, token: string): BookingAuth {
  return mode === 'cookie-token' ? tokenAuth(token) : basicAuth(env.username, env.password);
}

for (const mode of authModes) {
  test.describe(`Mutations via ${mode} auth`, () => {
    test(
      `Replaces a booking with PUT (${mode})`,
      { tag: ['@regression'] },
      async ({ bookingClient, createTestBooking, authToken }) => {
        const { bookingid } = await createTestBooking();
        const replacement = buildBooking();

        const updated = await bookingClient.updateBooking(
          bookingid,
          replacement,
          resolveAuth(mode, authToken)
        );
        expect(updated).toEqual(replacement);
      }
    );

    test(
      `Partially updates a booking with PATCH (${mode})`,
      { tag: ['@regression'] },
      async ({ bookingClient, createTestBooking, authToken }) => {
        const { bookingid, requested } = await createTestBooking();

        const updated = await bookingClient.partialUpdateBooking(
          bookingid,
          { firstname: `Renamed${requested.firstname}` },
          resolveAuth(mode, authToken)
        );
        expect(updated).toEqual({ ...requested, firstname: `Renamed${requested.firstname}` });
      }
    );

    test(
      `Deletes a booking (${mode})`,
      { tag: ['@regression'] },
      async ({ bookingClient, createTestBooking, authToken }) => {
        const { bookingid } = await createTestBooking();

        const deleteResponse = await bookingClient.deleteBooking(
          bookingid,
          resolveAuth(mode, authToken)
        );
        // restful-booker quirk: DELETE returns 201 Created (correct would be 200/204)
        expect(deleteResponse.status()).toBe(201);
      }
    );
  });
}
