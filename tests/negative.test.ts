import { test, expect } from '@playwright/test';
import Common from '../pages/common.page';
import userDetailsInvalidName from '../test-data/invalid/user_details_invalid_name.json';
import userDetailsInvalidJson from '../test-data/invalid/user_details_invalid_json.json';
import userDetailsMissingDate from '../test-data/invalid/user_details_missing_date.json';
import invalidTokenAuthCredentials from '../test-data/invalid/invalid_token_auth_credentials.json';
import update from '../test-data/valid/update_body.json';

test.describe('Restful Booker API Tests - Negative API Testing', async () => {
  const common = new Common();

  test.beforeEach(async ({}) => {
    console.log(`Running ${test.info().title}`);
  });

  test('Cannot Create Booking with Invalid Name', async ({ request }) => {
    const createBooking = await request.post(`/booking`, { data: userDetailsInvalidName });
    expect(createBooking.status()).toBe(500);
  });

  test('Cannot Create Booking with Invalid JSON', async ({ request }) => {
    const createBooking = await request.post(`/booking`, { data: userDetailsInvalidJson });
    expect(createBooking.status()).toBe(500);
  });

  test('Cannot Create Booking with Missing Date', async ({ request }) => {
    const createBooking = await request.post(`/booking`, { data: userDetailsMissingDate });
    expect(createBooking.status()).toBe(500);
  });

  test('Cannot Create Token with Invalid Credentials', async ({}) => {
    const createToken = await common.createToken(invalidTokenAuthCredentials);
    common.validateSuccessStatus(createToken, 200);
    const response = await createToken.json();
    expect(response.reason).toBe('Bad credentials');
  });

  test('Cannot Update Booking with Invalid Token', async ({ request }) => {
    const updateBooking = await request.put('/booking/1', {
      data: update,
      headers: { Cookie: 'token=123abc' },
    });
    expect(updateBooking.status()).toBe(403);
  });

  test('Cannot Delete Booking with Invalid Token', async ({ request }) => {
    const updateBooking = await request.delete('/booking/1', {
      headers: { Cookie: 'token=123abc' },
    });
    expect(updateBooking.status()).toBe(403);
  });
});
