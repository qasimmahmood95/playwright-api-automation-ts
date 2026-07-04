import { expect, test } from '../../src/fixtures';

test.describe('Booking search filters', () => {
  test(
    'Finds a booking by firstname and lastname',
    { tag: ['@regression'] },
    async ({ bookingClient, createTestBooking }) => {
      // Faker-unique names make content-based filtering deterministic even on
      // the shared public API where strangers create bookings concurrently.
      const { bookingid, requested } = await createTestBooking();

      const results = await bookingClient.getBookingIds({
        firstname: requested.firstname,
        lastname: requested.lastname,
      });
      expect(results.map((entry) => entry.bookingid)).toContain(bookingid);
    }
  );

  test(
    'Finds a booking by checkin date filter',
    // Quarantined: restful-booker's checkin filter has a reported off-by-one
    // (returns checkin > param instead of >=). Behavior needs verification
    // against the live API before this can gate CI — test:ci excludes
    // @quarantine via --grep-invert.
    { tag: ['@regression', '@quarantine'] },
    async ({ bookingClient, createTestBooking }) => {
      test.info().annotations.push({
        type: 'quarantine',
        description:
          'checkin filter has a reported upstream off-by-one; pending live-API verification',
      });
      const { bookingid, requested } = await createTestBooking();

      const checkin = new Date(requested.bookingdates.checkin);
      const dayBefore = new Date(checkin.getTime() - 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);

      const results = await bookingClient.getBookingIds({ checkin: dayBefore });
      expect(results.map((entry) => entry.bookingid)).toContain(bookingid);
    }
  );
});
