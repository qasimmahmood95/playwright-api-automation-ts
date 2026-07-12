import { expect, test } from '../../src/fixtures';
import { buildBooking } from '../../src/data/booking.factory';
import { tokenAuth } from '../../src/clients/booking.client';

test.describe('Booking CRUD', () => {
  test('Creates a booking', { tag: ['@smoke'] }, async ({ createTestBooking }) => {
    const { bookingid, booking, requested } = await createTestBooking();
    expect(bookingid).toBeGreaterThan(0);
    // Full round-trip: the API must echo every field it was sent.
    expect(booking).toEqual(requested);
  });

  test(
    'Gets a created booking',
    { tag: ['@smoke'] },
    async ({ bookingClient, createTestBooking }) => {
      const { bookingid, requested } = await createTestBooking();

      const fetched = await bookingClient.getBooking(bookingid);
      expect(fetched).toEqual(requested);
    }
  );

  test(
    'Lists booking ids',
    { tag: ['@regression'] },
    async ({ bookingClient, createTestBooking }) => {
      const { bookingid } = await createTestBooking();

      const bookingIds = await bookingClient.getBookingIds();
      expect(bookingIds.map((entry) => entry.bookingid)).toContain(bookingid);
    }
  );

  test(
    'Replaces a booking with PUT',
    { tag: ['@regression'] },
    async ({ bookingClient, createTestBooking, authToken }) => {
      const { bookingid } = await createTestBooking();
      const replacement = buildBooking();

      const updated = await bookingClient.updateBooking(
        bookingid,
        replacement,
        tokenAuth(authToken)
      );
      expect(updated).toEqual(replacement);
    }
  );

  test(
    'Partially updates a booking with PATCH',
    { tag: ['@regression'] },
    async ({ bookingClient, createTestBooking, authToken }) => {
      const { bookingid, requested } = await createTestBooking();

      const updated = await bookingClient.partialUpdateBooking(
        bookingid,
        { totalprice: requested.totalprice + 1 },
        tokenAuth(authToken)
      );
      // A PATCH must change exactly the fields it touched and nothing else.
      expect(updated).toEqual({ ...requested, totalprice: requested.totalprice + 1 });
    }
  );

  test(
    'Deletes a booking',
    { tag: ['@regression'] },
    async ({ bookingClient, createTestBooking, authToken }) => {
      test.info().annotations.push({
        type: 'api-quirk',
        description: 'DELETE returns 201 Created — 200/204 would be conventional',
      });
      const { bookingid } = await createTestBooking();

      const deleteResponse = await bookingClient.deleteBooking(bookingid, tokenAuth(authToken));
      // restful-booker quirk: DELETE returns 201 Created (correct would be 200/204) — documented API defect
      expect(deleteResponse.status()).toBe(201);

      const getDeleted = await bookingClient.getBookingRaw(bookingid);
      expect(getDeleted.status()).toBe(404);
    }
  );
});
