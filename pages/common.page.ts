import { expect, APIResponse, request } from '@playwright/test';
import userDetails from '../test-data/valid/user_details.json';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface TokenResponse {
  token: string;
}

export type Booking = typeof userDetails;

export interface CreateBookingResponse {
  bookingid: number;
  booking: Booking;
}

export default class Common {
  // Synchronous on purpose: an async assertion helper that callers forget to await
  // produces assertions that can silently pass.
  validateSuccessStatus(response: APIResponse, status: number): void {
    expect(response.status(), `unexpected status for ${response.url()}`).toBe(status);
  }

  async createNewBooking(): Promise<number> {
    const context = await request.newContext();
    const createBooking = await context.post(`/booking`, { data: userDetails });
    this.validateSuccessStatus(createBooking, 200);
    const response = (await createBooking.json()) as CreateBookingResponse;
    expect(response.booking).toHaveProperty('firstname', userDetails.firstname);
    return response.bookingid;
  }

  async createToken(data: AuthCredentials): Promise<APIResponse> {
    const context = await request.newContext();
    return context.post(`/auth`, { data });
  }
}
