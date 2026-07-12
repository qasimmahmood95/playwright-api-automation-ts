import { z } from 'zod';

export const AuthCredentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const TokenResponseSchema = z.object({
  token: z.string().min(1),
});

export type AuthCredentials = z.infer<typeof AuthCredentialsSchema>;
export type TokenResponse = z.infer<typeof TokenResponseSchema>;
