import { test, expect } from '@playwright/test';
import Common, { TokenResponse, CreateBookingResponse, Booking } from '../pages/common.page';
import userDetails from '../test-data/valid/user_details.json';
import tokenAuthCredentials from '../test-data/valid/token_auth_credentials.json';
import partialUpdate from '../test-data/valid/partial_update_body.json';
import update from '../test-data/valid/update_body.json';

test.describe('Restful Booker - Positive API Tests', () => {
  const common = new Common();
  let token = '';

  test.beforeEach(async () => {
    const createToken = await common.createToken(tokenAuthCredentials);
    // Validate the status BEFORE parsing the body so auth failures surface as
    // a clear status assertion, not a confusing undefined-token error downstream.
    common.validateSuccessStatus(createToken, 200);
    token = ((await createToken.json()) as TokenResponse).token;
  });

  test('Health Check', async ({ request }) => {
    const ping = await request.get(`/ping`);
    // restful-booker quirk: /ping returns 201 Created as its health signal (200 would be conventional)
    common.validateSuccessStatus(ping, 201);
  });

  test('Get Booking IDs', async ({ request }) => {
    const getBookingIds = await request.get(`/booking`);
    common.validateSuccessStatus(getBookingIds, 200);
  });

  test('Create Booking', async ({ request }) => {
    const createBooking = await request.post(`/booking`, { data: userDetails });
    common.validateSuccessStatus(createBooking, 200);
    const response = (await createBooking.json()) as CreateBookingResponse;
    expect(response.booking).toHaveProperty('firstname', userDetails.firstname);
  });

  test('Get Newly Created Booking', async ({ request }) => {
    const bookingId = await common.createNewBooking();

    const getBooking = await request.get(`/booking/${bookingId}`);
    common.validateSuccessStatus(getBooking, 200);
    const getResponse = (await getBooking.json()) as Booking;
    expect(getResponse).toHaveProperty('firstname', userDetails.firstname);
  });

  test('Update Booking', async ({ request }) => {
    const bookingId = await common.createNewBooking();

    const updateBooking = await request.put(`/booking/${bookingId}`, {
      data: update,
      headers: { Cookie: `token=${token}` },
    });
    common.validateSuccessStatus(updateBooking, 200);
    const response = (await updateBooking.json()) as Booking;
    expect(response).toHaveProperty('additionalneeds', update.additionalneeds);
  });

  test('Partially Update Booking', async ({ request }) => {
    const bookingId = await common.createNewBooking();

    const partiallyUpdateBooking = await request.patch(`/booking/${bookingId}`, {
      data: partialUpdate,
      headers: { Cookie: `token=${token}` },
    });
    common.validateSuccessStatus(partiallyUpdateBooking, 200);
    const response = (await partiallyUpdateBooking.json()) as Booking;
    expect(response).toHaveProperty('totalprice', partialUpdate.totalprice);
  });

  test('Delete Booking', async ({ request }) => {
    const bookingId = await common.createNewBooking();

    const deleteBooking = await request.delete(`/booking/${bookingId}`, {
      headers: { Cookie: `token=${token}` },
    });
    // restful-booker quirk: DELETE returns 201 Created (correct would be 200/204) — documented API defect
    common.validateSuccessStatus(deleteBooking, 201);

    const getBooking = await request.get(`/booking/${bookingId}`);
    expect(getBooking.status()).toBe(404);
  });
});
