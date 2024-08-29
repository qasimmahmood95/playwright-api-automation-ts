import { test, expect } from '@playwright/test';
import Common from '../pages/common.page';
import userDetails from '../test-data/valid/user_details.json';
import tokenAuthCredentials from '../test-data/valid/token_auth_credentials.json';
import partialUpdate from '../test-data/valid/partial_update_body.json';
import update from '../test-data/valid/update_body.json';

test.describe('Restful Booker - Positive API Tests', async () => {
  const common = new Common();
  let token = '';

  test.beforeEach(async ({}) => {
    console.log(`Running ${test.info().title}`);
    const createToken = await common.createToken(tokenAuthCredentials);
    token = (await createToken.json()).token;
    common.validateSuccessStatus(createToken, 200);
  });

  test('Health Check', async ({ request }) => {
    const ping = await request.get(`/ping`);
    common.validateSuccessStatus(ping, 201);
  });

  test('Get Booking IDs', async ({ request }) => {
    const getBookingIds = await request.get(`/booking`);
    common.validateSuccessStatus(getBookingIds, 200);
  });

  test('Create Booking', async ({ request }) => {
    const createBooking = await request.post(`/booking`, { data: userDetails });
    common.validateSuccessStatus(createBooking, 200);
    const response = await createBooking.json();
    expect(response.booking).toHaveProperty('firstname', userDetails.firstname);
  });

  test('Get Newly Created Booking', async ({ request }) => {
    const bookingId = await common.createNewBooking();

    const getBooking = await request.get('/booking/' + bookingId);
    common.validateSuccessStatus(getBooking, 200);
    const getResponse = await getBooking.json();
    expect(getResponse).toHaveProperty('firstname', userDetails.firstname);
  });

  test('Update Booking', async ({ request }) => {
    const bookingId = await common.createNewBooking();

    const updateBooking = await request.put('/booking/' + bookingId, {
      data: update,
      headers: { Cookie: 'token=' + token },
    });
    common.validateSuccessStatus(updateBooking, 200);
    const response = await updateBooking.json();
    expect(response).toHaveProperty('additionalneeds', update.additionalneeds);
  });

  test('Partially Update Booking', async ({ request }) => {
    const bookingId = await common.createNewBooking();

    const partiallyUpdateBooking = await request.patch('/booking/' + bookingId, {
      data: partialUpdate,
      headers: { Cookie: 'token=' + token },
    });
    common.validateSuccessStatus(partiallyUpdateBooking, 200);
    const response = await partiallyUpdateBooking.json();
    expect(response).toHaveProperty('totalprice', partialUpdate.totalprice);
  });

  test('Delete Booking', async ({ request }) => {
    const bookingId = await common.createNewBooking();

    const deleteBooking = await request.delete('/booking/' + bookingId, {
      headers: { Cookie: 'token=' + token },
    });
    common.validateSuccessStatus(deleteBooking, 201);

    const getBooking = await request.get('/booking/' + bookingId);
    expect(getBooking.status()).toBe(404);
  });
});
