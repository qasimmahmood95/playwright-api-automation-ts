import { expect, test } from '../src/fixtures';
import userDetails from '../test-data/valid/user_details.json';
import partialUpdate from '../test-data/valid/partial_update_body.json';
import update from '../test-data/valid/update_body.json';

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
    const created = await createTestBooking();
    expect(created.bookingid).toBeGreaterThan(0);
    expect(created.booking).toEqual(userDetails);
  });

  test('Get Newly Created Booking', async ({ bookingClient, createTestBooking }) => {
    const { bookingid } = await createTestBooking();

    const booking = await bookingClient.getBooking(bookingid);
    expect(booking).toEqual(userDetails);
  });

  test('Update Booking', async ({ bookingClient, createTestBooking, authToken }) => {
    const { bookingid } = await createTestBooking();

    const updated = await bookingClient.updateBooking(bookingid, update, authToken);
    expect(updated).toEqual(update);
  });

  test('Partially Update Booking', async ({ bookingClient, createTestBooking, authToken }) => {
    const { bookingid } = await createTestBooking();

    const updated = await bookingClient.partialUpdateBooking(bookingid, partialUpdate, authToken);
    expect(updated.totalprice).toBe(partialUpdate.totalprice);
    // A PATCH must leave every field it did not touch intact.
    expect(updated.firstname).toBe(userDetails.firstname);
    expect(updated.bookingdates).toEqual(userDetails.bookingdates);
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
