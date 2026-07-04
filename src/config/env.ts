/**
 * Environment configuration with documented defaults.
 *
 * The default credentials are restful-booker's PUBLIC demo credentials, documented at
 * https://restful-booker.herokuapp.com/apidoc — they are not secrets. In a real project
 * these values would come from CI secrets; the env-var plumbing here is the pattern,
 * exercised via BASE_URL (e.g. to point the suite at a locally hosted instance).
 */
export const env = {
  baseURL: process.env.BASE_URL ?? 'https://restful-booker.herokuapp.com',
  username: process.env.BOOKER_USERNAME ?? 'admin',
  password: process.env.BOOKER_PASSWORD ?? 'password123',
};
