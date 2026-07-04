import { APIRequestContext, APIResponse, expect } from '@playwright/test';

export interface AuthCredentials {
  username: string;
  password: string;
}

export interface TokenResponse {
  token: string;
}

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

  /** Happy-path token acquisition: asserts success and returns the token string. */
  async getToken(credentials: AuthCredentials): Promise<string> {
    const response = await this.createToken(credentials);
    expect(response.status(), 'POST /auth should succeed').toBe(200);
    const body = (await response.json()) as Partial<TokenResponse>;
    expect(body.token, 'auth response should contain a token').toBeTruthy();
    return body.token as string;
  }
}
