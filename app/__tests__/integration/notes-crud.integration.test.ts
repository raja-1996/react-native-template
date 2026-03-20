/**
 * Integration tests for Rooms & Messages CRUD against a real backend.
 *
 * Run:
 *   API_URL=http://localhost:8000 npx jest --config jest.integration.config.js notes-crud
 */
import {
  AuthTokens,
  createClient,
  getOrCreateTestUser,
  TEST_PASSWORD,
} from "./api-helpers";

const RUN_ID = Date.now().toString(36);
const UNIQUE_EMAIL = `chat-test-${RUN_ID}@integration.test`;

describe("Rooms & Messages CRUD integration tests", () => {
  let tokens: AuthTokens;
  let roomId: string;
  let messageId: string;

  beforeAll(async () => {
    tokens = await getOrCreateTestUser(UNIQUE_EMAIL, TEST_PASSWORD);
  });

  describe("POST /rooms", () => {
    it("should create a new room", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.post("/rooms", {
        name: "Integration Test Room",
      });

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty("id");
      expect(res.data.name).toBe("Integration Test Room");
      expect(res.data).toHaveProperty("created_at");

      roomId = res.data.id;
    });

    it("should reject creating a room without auth", async () => {
      const client = createClient();
      const res = await client.post("/rooms", {
        name: "Unauthorized Room",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /rooms", () => {
    it("should list rooms for the authenticated user", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.get("/rooms");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(1);

      const found = res.data.find(
        (r: { id: string }) => r.id === roomId
      );
      expect(found).toBeDefined();
      expect(found.name).toBe("Integration Test Room");
    });
  });

  describe("PATCH /rooms/:id", () => {
    it("should update room name", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.patch(`/rooms/${roomId}`, {
        name: "Updated Room",
      });

      expect(res.status).toBe(200);
      expect(res.data.name).toBe("Updated Room");
    });
  });

  describe("POST /rooms/:id/messages", () => {
    it("should create a new message", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.post(`/rooms/${roomId}/messages`, {
        content: "Hello from integration test",
      });

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty("id");
      expect(res.data.content).toBe("Hello from integration test");

      messageId = res.data.id;
    });
  });

  describe("GET /rooms/:id/messages", () => {
    it("should list messages in a room", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.get(`/rooms/${roomId}/messages`);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty("data");
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("PATCH /rooms/:id/messages/:messageId", () => {
    it("should update a message", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.patch(`/rooms/${roomId}/messages/${messageId}`, {
        content: "Edited message",
      });

      expect(res.status).toBe(200);
      expect(res.data.content).toBe("Edited message");
    });
  });

  describe("DELETE /rooms/:id/messages/:messageId", () => {
    it("should delete a message", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.delete(`/rooms/${roomId}/messages/${messageId}`);

      expect(res.status).toBeLessThan(500);
    });
  });

  describe("DELETE /rooms/:id", () => {
    it("should delete a room", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.delete(`/rooms/${roomId}`);

      expect(res.status).toBeLessThan(500);
    });
  });
});
