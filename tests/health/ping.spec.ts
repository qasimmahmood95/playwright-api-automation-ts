import { expect, test } from '../../src/fixtures';

test('Health check responds', { tag: ['@smoke'] }, async ({ request }) => {
  test.info().annotations.push({
    type: 'api-quirk',
    description: '/ping returns 201 Created as its health signal — 200 would be conventional',
  });
  const ping = await request.get('/ping');
  // restful-booker quirk: /ping returns 201 Created as its health signal (200 would be conventional)
  expect(ping.status()).toBe(201);
});
