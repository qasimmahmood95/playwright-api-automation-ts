import { expect, test } from '../../src/fixtures';

test.describe('Content negotiation', () => {
  test(
    'Returns XML when Accept: application/xml is requested',
    { tag: ['@regression'] },
    async ({ request, createTestBooking }) => {
      // ASCII-only name keeps the XML assertion free of entity-escaping concerns.
      const { bookingid, requested } = await createTestBooking({ firstname: 'Xmlcheck' });

      // Per-request Accept header overrides the suite-wide application/json default.
      const response = await request.get(`/booking/${bookingid}`, {
        headers: { Accept: 'application/xml' },
      });
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('xml');
      const body = await response.text();
      expect(body).toContain(`<firstname>${requested.firstname}</firstname>`);
    }
  );

  test(
    'Returns JSON with the expected content type',
    { tag: ['@regression'] },
    async ({ request, createTestBooking }) => {
      const { bookingid } = await createTestBooking();

      const response = await request.get(`/booking/${bookingid}`);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('application/json');
    }
  );
});
