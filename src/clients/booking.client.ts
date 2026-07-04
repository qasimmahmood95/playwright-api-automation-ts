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

  async updateBooking(id: number, booking: Booking, token: string): Promise<Booking> {
    const response = await this.updateBookingRaw(id, booking, token);
    expect(response.status(), `PUT /booking/${id} should succeed`).toBe(200);
    return BookingSchema.parse(await response.json());
  }

  async updateBookingRaw(id: number, payload: unknown, token: string): Promise<APIResponse> {
    return this.request.put(`/booking/${id}`, {
      data: payload,
      headers: { Cookie: `token=${token}` },
    });
  }

  async partialUpdateBooking(
    id: number,
    partial: Partial<Booking>,
    token: string
  ): Promise<Booking> {
    const response = await this.request.patch(`/booking/${id}`, {
      data: partial,
      headers: { Cookie: `token=${token}` },
    });
    expect(response.status(), `PATCH /booking/${id} should succeed`).toBe(200);
    return BookingSchema.parse(await response.json());
  }

  /**
   * Returns the raw response: the success status is restful-booker's quirky 201
   * (asserted, with a comment, in the tests) and negative tests probe 403s here.
   */
  async deleteBooking(id: number, token: string): Promise<APIResponse> {
    return this.request.delete(`/booking/${id}`, {
      headers: { Cookie: `token=${token}` },
    });
  }
}
