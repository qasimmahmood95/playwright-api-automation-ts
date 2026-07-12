import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import {
  Booking,
  BookingId,
  BookingIdsSchema,
  BookingSchema,
  CreateBookingResponse,
  CreateBookingResponseSchema,
} from '../schemas/booking.schema';

export interface BookingFilters {
  firstname?: string;
  lastname?: string;
  checkin?: string;
  checkout?: string;
}

/**
 * restful-booker documents two interchangeable auth channels for mutations:
 * a Cookie token from POST /auth, and HTTP Basic. `none` lets negative tests
 * probe unauthenticated requests.
 */
export type BookingAuth =
  | { mode: 'token'; token: string }
  | { mode: 'basic'; username: string; password: string }
  | { mode: 'none' };

export const tokenAuth = (token: string): BookingAuth => ({ mode: 'token', token });
export const basicAuth = (username: string, password: string): BookingAuth => ({
  mode: 'basic',
  username,
  password,
});
export const noAuth: BookingAuth = { mode: 'none' };

function authHeaders(auth: BookingAuth): Record<string, string> {
  switch (auth.mode) {
    case 'token':
      return { Cookie: `token=${auth.token}` };
    case 'basic':
      return {
        Authorization: `Basic ${Buffer.from(`${auth.username}:${auth.password}`).toString('base64')}`,
      };
    case 'none':
      return {};
  }
}

/**
 * Thin typed wrapper over the /booking endpoints. Receives the test's own
 * APIRequestContext (the `request` fixture), so calls inherit baseURL,
 * show up in traces, and are disposed automatically.
 *
 * Happy-path methods assert the expected status and validate the full
 * response body against the zod contract schemas; the *Raw variants make no
 * assertions so negative tests can probe error semantics.
 */
export class BookingClient {
  constructor(private readonly request: APIRequestContext) {}

  async getBookingIds(filters: BookingFilters = {}): Promise<BookingId[]> {
    const params = Object.fromEntries(
      Object.entries(filters).filter(([, value]) => value !== undefined)
    );
    const response = await this.request.get('/booking', { params });
    expect(response.status(), 'GET /booking should succeed').toBe(200);
    return BookingIdsSchema.parse(await response.json());
  }

  async getBooking(id: number): Promise<Booking> {
    const response = await this.getBookingRaw(id);
    expect(response.status(), `GET /booking/${id} should succeed`).toBe(200);
    return BookingSchema.parse(await response.json());
  }

  async getBookingRaw(id: number): Promise<APIResponse> {
    return this.request.get(`/booking/${id}`);
  }

  async createBooking(booking: Booking): Promise<CreateBookingResponse> {
    const response = await this.createBookingRaw(booking);
    expect(response.status(), 'POST /booking should succeed').toBe(200);
    return CreateBookingResponseSchema.parse(await response.json());
  }

  async createBookingRaw(payload: unknown): Promise<APIResponse> {
    return this.request.post('/booking', { data: payload });
  }

  async updateBooking(id: number, booking: Booking, auth: BookingAuth): Promise<Booking> {
    const response = await this.updateBookingRaw(id, booking, auth);
    expect(response.status(), `PUT /booking/${id} should succeed`).toBe(200);
    return BookingSchema.parse(await response.json());
  }

  async updateBookingRaw(id: number, payload: unknown, auth: BookingAuth): Promise<APIResponse> {
    return this.request.put(`/booking/${id}`, {
      data: payload,
      headers: authHeaders(auth),
    });
  }

  async partialUpdateBooking(
    id: number,
    partial: Partial<Booking>,
    auth: BookingAuth
  ): Promise<Booking> {
    const response = await this.partialUpdateBookingRaw(id, partial, auth);
    expect(response.status(), `PATCH /booking/${id} should succeed`).toBe(200);
    return BookingSchema.parse(await response.json());
  }

  async partialUpdateBookingRaw(
    id: number,
    payload: unknown,
    auth: BookingAuth
  ): Promise<APIResponse> {
    return this.request.patch(`/booking/${id}`, {
      data: payload,
      headers: authHeaders(auth),
    });
  }

  /**
   * Returns the raw response: the success status is restful-booker's quirky 201
   * (asserted, with a comment, in the tests) and negative tests probe 403s here.
   */
  async deleteBooking(id: number, auth: BookingAuth): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`, {
      headers: authHeaders(auth),
    });
  }
}
