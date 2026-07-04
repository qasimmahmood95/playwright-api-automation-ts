import { buildBooking } from './booking.factory';
import { AuthCredentials } from '../schemas/auth.schema';

/**
 * Deliberately broken booking payloads, built as variants of valid factory
 * output so the delta from a correct payload is explicit. Each names the
 * contract rule it violates.
 *
 * restful-booker responds 500 to all of them — a documented API defect
 * (a compliant API would return 400).
 */

/** Violates: firstname/lastname must be strings. */
export const bookingWithNumericName: unknown = {
  ...buildBooking(),
  firstname: 123,
  lastname: 456,
};

/** Violates: bookingdates must be an object of {checkin, checkout}. */
export const bookingWithMalformedDates: unknown = {
  ...buildBooking(),
  bookingdates: 'not-an-object',
};

/** Violates: bookingdates.checkout is required. */
export const bookingMissingCheckout: unknown = (() => {
  const { bookingdates, ...rest } = buildBooking();
  return { ...rest, bookingdates: { checkin: bookingdates.checkin } };
})();

/** Credentials that do not exist — restful-booker answers 200 + reason instead of 401. */
export const invalidCredentials: AuthCredentials = {
  username: 'not-a-real-user',
  password: 'wrong-password',
};
