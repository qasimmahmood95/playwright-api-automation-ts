import { expect, APIResponse, request } from '@playwright/test';
import userDetails from '../test-data/valid/user_details.json';

export default class Common {
  async validateSuccessStatus(response: APIResponse, status: number) {
    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(status);
  }

  async createNewBooking() {
    const context = await request.newContext();
    const createBooking = await context.post(`/booking`, { data: userDetails });
    this.validateSuccessStatus(createBooking, 200);
    const response = await createBooking.json();
    expect(response.booking).toHaveProperty('firstname', userDetails.firstname);
    const bookingId = response.bookingid;

    return bookingId;
  }

  async createToken(data: any) {
    const context = await request.newContext();
    const createToken = await context.post(`/auth`, {
      data: data,
    });

    return createToken;
  }
}
