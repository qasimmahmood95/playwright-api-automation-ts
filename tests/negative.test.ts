import { expect, test } from '../src/fixtures';
import userDetailsInvalidName from '../test-data/invalid/user_details_invalid_name.json';
import userDetailsInvalidJson from '../test-data/invalid/user_details_invalid_json.json';
import userDetailsMissingDate from '../test-data/invalid/user_details_missing_date.json';
import invalidTokenAuthCredentials from '../test-data/invalid/invalid_token_auth_credentials.json';
import update from '../test-data/valid/update_body.json';

test.describe('Restful Booker - Negative API Tests', () => {
  test('Cannot Create Booking with Invalid Name', async ({ bookingClient }) => {
    const response = await bookingClient.createBookingRaw(userDetailsInvalidName);
    // restful-booker quirk: validation failures return 500 (correct would be 400) — documented API defect
    expect(response.status()).toBe(500);
  });

  test('Cannot Create Booking with Invalid JSON', async ({ bookingClient }) => {
    const response = await bookingClient.createBookingRaw(userDetailsInvalidJson);
    // restful-booker quirk: validation failures return 500 (correct would be 400) — documented API defect
    expect(response.status()).toBe(500);
  });

  test('Cannot Create Booking with Missing Date', async ({ bookingClient }) => {
    const response = await bookingClient.createBookingRaw(userDetailsMissingDate);
    // restful-booker quirk: validation failures return 500 (correct would be 400) — documented API defect
    expect(response.status()).toBe(500);
  });

  test('Cannot Create Token with Invalid Credentials', async ({ authClient }) => {
    const response = await authClient.createToken(invalidTokenAuthCredentials);
    // restful-booker quirk: failed auth returns 200 + {reason: 'Bad credentials'} instead of 401
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { reason: string };
    expect(body.reason).toBe('Bad credentials');
  });

  test('Cannot Update Booking with Invalid Token', async ({ bookingClient, createTestBooking }) => {
    // Each test owns its resource — no dependency on booking id 1 existing on the shared API.
    const { bookingid } = await createTestBooking();

    const response = await bookingClient.updateBookingRaw(bookingid, update, 'not-a-real-token');
    expect(response.status()).toBe(403);
  });

  test('Cannot Delete Booking with Invalid Token', async ({ bookingClient, createTestBooking }) => {
    const { bookingid } = await createTestBooking();

    const response = await bookingClient.deleteBooking(bookingid, 'not-a-real-token');
    expect(response.status()).toBe(403);
  });
});
