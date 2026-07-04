import { expect, test } from '../../src/fixtures';
import { invalidCredentials } from '../../src/data/invalid-bookings';
import { env } from '../../src/config/env';

test.describe('Auth token', () => {
  test('Creates a token with valid credentials', { tag: ['@smoke'] }, async ({ authClient }) => {
    const token = await authClient.getToken({ username: env.username, password: env.password });
    expect(token.length).toBeGreaterThan(0);
  });

  test('Rejects invalid credentials', { tag: ['@negative'] }, async ({ authClient }) => {
    test.info().annotations.push({
      type: 'api-quirk',
      description:
        'failed auth returns 200 + {reason: "Bad credentials"} — 401 would be conventional',
    });
    const response = await authClient.createToken(invalidCredentials);
    // restful-booker quirk: failed auth returns 200 + {reason: 'Bad credentials'} instead of 401
    expect(response.status()).toBe(200);
    const body = (await response.json()) as { reason: string };
    expect(body.reason).toBe('Bad credentials');
  });
});
