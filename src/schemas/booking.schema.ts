import { z } from 'zod';

/**
 * Contract schemas for the /booking endpoints. Clients parse every response
 * body through these, so each API call transparently validates the full
 * response shape — and `z.infer` derives the static types, giving schemas,
 * clients, factories, and tests a single source of truth.
 */

export const BookingDatesSchema = z.object({
  // restful-booker uses plain YYYY-MM-DD dates
  checkin: z.iso.date(),
  checkout: z.iso.date(),
});

export const BookingSchema = z.object({
  firstname: z.string(),
  lastname: z.string(),
  totalprice: z.number(),
  depositpaid: z.boolean(),
  bookingdates: BookingDatesSchema,
  additionalneeds: z.string().optional(),
});

export const CreateBookingResponseSchema = z.object({
  bookingid: z.number().int().positive(),
  booking: BookingSchema,
});

export const BookingIdSchema = z.object({
  bookingid: z.number().int(),
});

export const BookingIdsSchema = z.array(BookingIdSchema);

export type BookingDates = z.infer<typeof BookingDatesSchema>;
export type Booking = z.infer<typeof BookingSchema>;
export type CreateBookingResponse = z.infer<typeof CreateBookingResponseSchema>;
export type BookingId = z.infer<typeof BookingIdSchema>;
