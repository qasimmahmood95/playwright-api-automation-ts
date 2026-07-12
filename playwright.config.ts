import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // Guard against an accidentally committed test.only starving CI of coverage.
  forbidOnly: !!process.env.CI,
  // Retries exist for the live target (a free Heroku dyno: cold starts, shared
  // tenancy) and only on CI. Locally a failure should fail immediately —
  // local retries mask flakiness during development.
  retries: process.env.CI ? 2 : 0,
  // Shared public API — be a polite tenant on CI. Locally, one worker per core.
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI
    ? [['list'], ['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  // Generous per-test budget: a Heroku cold start alone can take ~10s.
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    // Env-overridable so the same suite can target another instance
    // (e.g. BASE_URL=http://localhost:3001 for a locally hosted restful-booker).
    baseURL: env.baseURL,
    // The API defaults some responses to text/html without this.
    extraHTTPHeaders: { Accept: 'application/json' },
    trace: 'on-first-retry',
  },
});
