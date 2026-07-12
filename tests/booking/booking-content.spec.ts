import { expect, test } from '../../src/fixtures';

test.describe('Content negotiation', () => {
  test(
    'Returns XML when Accept: application/xml is requested',
    { tag: ['@regression'] },
    async ({ request, createTestBooking }) => {
      test.info().annotations.push({
        type: 'api-quirk',
        description:
          'XML responses are served with Content-Type text/html — application/xml would be correct',
      });
      // ASCII-only name keeps the XML assertion free of entity-escaping concerns.
      const { bookingid, requested } = await createTestBooking({ firstname: 'Xmlcheck' });

      // Per-request Accept header overrides the suite-wide application/json default.
      const response = await request.get(`/booking/${bookingid}`, {
        headers: { Accept: 'application/xml' },
      });
      expect(response.status()).toBe(200);
      // The functional check first: the body really is XML (a failure prints the received body).
      const body = await response.text();
      expect(body).toContain(`<firstname>${requested.firstname}</firstname>`);
      // restful-booker quirk: the XML body is sent via Express's default res.send(), which
      // stamps text/html instead of application/xml — documented API defect (live-verified).
      expect(response.headers()['content-type']).toContain('text/html');
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
