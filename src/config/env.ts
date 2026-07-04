import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ quiet: true });

/**
 * Typed, validated environment configuration — fails fast with a readable
 * error if a variable is malformed.
 *
 * The default credentials are restful-booker's PUBLIC demo credentials,
 * documented at https://restful-booker.herokuapp.com/apidoc — they are not
 * secrets. In a real project these would come from CI secrets; the env-var
 * plumbing here is the pattern, exercised via BASE_URL (e.g. to point the
 * suite at a locally hosted instance).
 */
const EnvSchema = z.object({
  BASE_URL: z.url().default('https://restful-booker.herokuapp.com'),
  BOOKER_USERNAME: z.string().min(1).default('admin'),
  BOOKER_PASSWORD: z.string().min(1).default('password123'),
});

const parsed = EnvSchema.parse({
  BASE_URL: process.env.BASE_URL,
  BOOKER_USERNAME: process.env.BOOKER_USERNAME,
  BOOKER_PASSWORD: process.env.BOOKER_PASSWORD,
});

export const env = Object.freeze({
  baseURL: parsed.BASE_URL,
  username: parsed.BOOKER_USERNAME,
  password: parsed.BOOKER_PASSWORD,
});
