/**
 * Integration tests for the authentication flow against a real backend.
 *
 * Run:
 *   API_URL=http://localhost:8000 npx jest --config jest.integration.config.js auth
 */
import {
  BASE,
  createClient,
  getOrCreateTestUser,
  TEST_PASSWORD,
} from "./api-helpers";

const RUN_ID = Date.now().toString(36);
const UNIQUE_EMAIL = `auth-test-${RUN_ID}@integration.test`;

describe("Auth integration tests", () => {
  describe("POST /auth/signup", () => {
    it("should create a new user and return tokens", async () => {
      const client = createClient();
      const res = await client.post("/auth/signup", {
        email: UNIQUE_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty("access_token");
      expect(res.data).toHaveProperty("refresh_token");
      expect(res.data).toHaveProperty("user");
      expect(res.data.user.email).toBe(UNIQUE_EMAIL);
    });

    it("should reject duplicate signup", async () => {
      const client = createClient();
      const res = await client.post("/auth/signup", {
        email: UNIQUE_EMAIL,
        password: TEST_PASSWORD,
      });

      // Should be a 4xx error
      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /auth/login", () => {
    it("should log in an existing user", async () => {
      const client = createClient();
      const res = await client.post("/auth/login", {
        email: UNIQUE_EMAIL,
        password: TEST_PASSWORD,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty("access_token");
      expect(res.data).toHaveProperty("refresh_token");
      expect(res.data.user.email).toBe(UNIQUE_EMAIL);
    });

    it("should reject invalid credentials", async () => {
      const client = createClient();
      const res = await client.post("/auth/login", {
        email: UNIQUE_EMAIL,
        password: "wrong-password",
      });

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("POST /auth/refresh", () => {
    it("should issue new tokens from a valid refresh token", async () => {
      const tokens = await getOrCreateTestUser(UNIQUE_EMAIL, TEST_PASSWORD);
      const client = createClient();
      const res = await client.post("/auth/refresh", {
        refresh_token: tokens.refresh_token,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty("access_token");
      expect(res.data).toHaveProperty("refresh_token");
    });
  });

  describe("POST /auth/logout", () => {
    it("should log out successfully", async () => {
      const tokens = await getOrCreateTestUser(UNIQUE_EMAIL, TEST_PASSWORD);
      const client = createClient(tokens.access_token);
      const res = await client.post("/auth/logout");

      expect(res.status).toBeLessThan(500);
    });
  });

  describe("Protected routes", () => {
    it("should reject unauthenticated requests", async () => {
      const client = createClient();
      const res = await client.get("/notes");

      expect(res.status).toBe(401);
    });

    it("should allow authenticated requests", async () => {
      const tokens = await getOrCreateTestUser(UNIQUE_EMAIL, TEST_PASSWORD);
      const client = createClient(tokens.access_token);
      const res = await client.get("/notes");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
    });
  });
});
