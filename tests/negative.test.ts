import { expect, test } from '../src/fixtures';
import { buildBooking } from '../src/data/booking.factory';
import {
  bookingMissingCheckout,
  bookingWithMalformedDates,
  bookingWithNumericName,
  invalidCredentials,
} from '../src/data/invalid-bookings';

test.describe('Restful Booker - Negative API Tests', () => {
  test('Cannot Create Booking with Numeric Name', async ({ bookingClient }) => {
    const response = await bookingClient.createBookingRaw(bookingWithNumericName);
    // restful-booker quirk: validation failures return 500 (correct would be 400) — documented API defect
    expect(response.status()).toBe(500);
  });

  test('Cannot Create Booking with Malformed Dates', async ({ bookingClient }) => {
    const response = await bookingClient.createBookingRaw(bookingWithMalformedDates);
    // restful-booker quirk: validation failures return 500 (correct would be 400) — documented API defect
    expect(response.status()).toBe(500);
  });

  test('Cannot Create Booking with Missing Checkout Date', async ({ bookingClient }) => {
    const response = await bookingClient.createBookingRaw(bookingMissingCheckout);
    // restful-booker quirk: validation failures return 500 (correct would be 400) — documented API defect
    expect(response.status()).toBe(500);
  });

  test('Cannot Create Token with Invalid Credentials', async ({ authClient }) => {
    const response = await authClient.createToken(invalidCredentials);
    // restful-booker quirk: failed auth returns 200 + {reason: 'Bad credentials'} instead of 401
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { reason: string };
    expect(body.reason).toBe('Bad credentials');
  });

  test('Cannot Update Booking with Invalid Token', async ({ bookingClient, createTestBooking }) => {
    // Each test owns its resource — no dependency on booking id 1 existing on the shared API.
    const { bookingid } = await createTestBooking();

    const response = await bookingClient.updateBookingRaw(
      bookingid,
      buildBooking(),
      'not-a-real-token'
    );
    expect(response.status()).toBe(403);
  });

  test('Cannot Delete Booking with Invalid Token', async ({ bookingClient, createTestBooking }) => {
    const { bookingid } = await createTestBooking();

    const response = await bookingClient.deleteBooking(bookingid, 'not-a-real-token');
    expect(response.status()).toBe(403);
  });
});
