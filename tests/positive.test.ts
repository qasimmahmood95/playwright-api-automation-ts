import { expect, test } from '../src/fixtures';
import { buildBooking } from '../src/data/booking.factory';

test.describe('Restful Booker - Positive API Tests', () => {
  test('Health Check', async ({ request }) => {
    const ping = await request.get('/ping');
    // restful-booker quirk: /ping returns 201 Created as its health signal (200 would be conventional)
    expect(ping.status()).toBe(201);
  });

  test('Get Booking IDs', async ({ bookingClient }) => {
    const bookingIds = await bookingClient.getBookingIds();
    expect(bookingIds.length).toBeGreaterThan(0);
  });

  test('Create Booking', async ({ createTestBooking }) => {
    const { bookingid, booking, requested } = await createTestBooking();
    expect(bookingid).toBeGreaterThan(0);
    // Full round-trip: the API must echo every field it was sent.
    expect(booking).toEqual(requested);
  });

  test('Get Newly Created Booking', async ({ bookingClient, createTestBooking }) => {
    const { bookingid, requested } = await createTestBooking();

    const fetched = await bookingClient.getBooking(bookingid);
    expect(fetched).toEqual(requested);
  });

  test('Update Booking', async ({ bookingClient, createTestBooking, authToken }) => {
    const { bookingid } = await createTestBooking();
    const replacement = buildBooking();

    const updated = await bookingClient.updateBooking(bookingid, replacement, authToken);
    expect(updated).toEqual(replacement);
  });

  test('Partially Update Booking', async ({ bookingClient, createTestBooking, authToken }) => {
    const { bookingid, requested } = await createTestBooking();

    const updated = await bookingClient.partialUpdateBooking(
      bookingid,
      { totalprice: requested.totalprice + 1 },
      authToken
    );
    // A PATCH must change exactly the fields it touched and nothing else.
    expect(updated).toEqual({ ...requested, totalprice: requested.totalprice + 1 });
  });

  test('Delete Booking', async ({ bookingClient, createTestBooking, authToken }) => {
    const { bookingid } = await createTestBooking();

    const deleteResponse = await bookingClient.deleteBooking(bookingid, authToken);
    // restful-booker quirk: DELETE returns 201 Created (correct would be 200/204) — documented API defect
    expect(deleteResponse.status()).toBe(201);

    const getDeleted = await bookingClient.getBookingRaw(bookingid);
    expect(getDeleted.status()).toBe(404);
  });
});
