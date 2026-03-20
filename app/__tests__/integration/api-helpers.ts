/**
 * Shared helpers for integration tests that hit the real backend.
 *
 * Env vars:
 *   API_URL            – e.g. http://localhost:8000  (required)
 *   TEST_USER_EMAIL    – existing test user email    (optional)
 *   TEST_USER_PASSWORD – password                    (optional, default "Test1234!")
 */
import axios, { AxiosInstance } from "axios";

export const API_URL = process.env.API_URL || "http://localhost:8000";
export const BASE = `${API_URL}/api/v1`;

// Generate a unique test email per run to avoid conflicts
const RUN_ID = Date.now().toString(36);
export const TEST_EMAIL =
  process.env.TEST_USER_EMAIL || `test-${RUN_ID}@integration.test`;
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD || "Test1234!";

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  user: { id: string; email: string };
}

/** Create an axios client pointing at the real API */
export function createClient(token?: string): AxiosInstance {
  const client = axios.create({
    baseURL: BASE,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    // Don't throw on non-2xx so we can inspect status codes
    validateStatus: () => true,
  });
  return client;
}

/** Sign up a new test user, returns tokens */
export async function signupTestUser(
  email = TEST_EMAIL,
  password = TEST_PASSWORD
): Promise<AuthTokens> {
  const client = createClient();
  const res = await client.post("/auth/signup", { email, password });
  if (res.status >= 400) {
    throw new Error(
      `Signup failed (${res.status}): ${JSON.stringify(res.data)}`
    );
  }
  return res.data;
}

/** Log in an existing user, returns tokens */
export async function loginTestUser(
  email = TEST_EMAIL,
  password = TEST_PASSWORD
): Promise<AuthTokens> {
  const client = createClient();
  const res = await client.post("/auth/login", { email, password });
  if (res.status >= 400) {
    throw new Error(
      `Login failed (${res.status}): ${JSON.stringify(res.data)}`
    );
  }
  return res.data;
}

/** Sign up or login — useful for idempotent test setup */
export async function getOrCreateTestUser(
  email = TEST_EMAIL,
  password = TEST_PASSWORD
): Promise<AuthTokens> {
  try {
    return await signupTestUser(email, password);
  } catch {
    // User probably already exists → login instead
    return await loginTestUser(email, password);
  }
}
