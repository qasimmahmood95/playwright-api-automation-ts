import { APIRequestContext, APIResponse, expect } from '@playwright/test';
import { AuthCredentials, TokenResponseSchema } from '../schemas/auth.schema';

/**
 * Thin typed wrapper over the /auth endpoint. Receives the test's own
 * APIRequestContext (the `request` fixture), so calls inherit baseURL,
 * show up in traces, and are disposed automatically.
 */
export class AuthClient {
  constructor(private readonly request: APIRequestContext) {}

  /** Raw POST /auth — no assertions, usable by negative tests. */
  async createToken(credentials: AuthCredentials): Promise<APIResponse> {
    return this.request.post('/auth', { data: credentials });
  }

  /** Happy-path token acquisition: asserts success, validates the contract, returns the token. */
  async getToken(credentials: AuthCredentials): Promise<string> {
    const response = await this.createToken(credentials);
    expect(response.status(), 'POST /auth should succeed').toBe(200);
    return TokenResponseSchema.parse(await response.json()).token;
  }
}
