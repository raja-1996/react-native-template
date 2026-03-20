/**
 * Integration tests for Notes CRUD against a real backend.
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
const UNIQUE_EMAIL = `notes-test-${RUN_ID}@integration.test`;

describe("Notes CRUD integration tests", () => {
  let tokens: AuthTokens;
  let noteId: string;

  beforeAll(async () => {
    tokens = await getOrCreateTestUser(UNIQUE_EMAIL, TEST_PASSWORD);
  });

  describe("POST /notes", () => {
    it("should create a new note", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.post("/notes", {
        title: "Integration Test Note",
        content: "Created by integration tests",
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty("id");
      expect(res.data.title).toBe("Integration Test Note");
      expect(res.data.content).toBe("Created by integration tests");
      expect(res.data).toHaveProperty("created_at");
      expect(res.data).toHaveProperty("updated_at");

      noteId = res.data.id;
    });

    it("should create a note with only title", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.post("/notes", {
        title: "Title Only Note",
      });

      expect(res.status).toBe(200);
      expect(res.data.title).toBe("Title Only Note");

      // Clean up
      await client.delete(`/notes/${res.data.id}`);
    });

    it("should reject creating a note without auth", async () => {
      const client = createClient();
      const res = await client.post("/notes", {
        title: "Unauthorized Note",
      });

      expect(res.status).toBe(401);
    });
  });

  describe("GET /notes", () => {
    it("should list notes for the authenticated user", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.get("/notes");

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      expect(res.data.length).toBeGreaterThanOrEqual(1);

      const found = res.data.find(
        (n: { id: string }) => n.id === noteId
      );
      expect(found).toBeDefined();
      expect(found.title).toBe("Integration Test Note");
    });
  });

  describe("GET /notes/:id", () => {
    it("should fetch a single note by id", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.get(`/notes/${noteId}`);

      expect(res.status).toBe(200);
      expect(res.data.id).toBe(noteId);
      expect(res.data.title).toBe("Integration Test Note");
    });

    it("should return 404 for non-existent note", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.get("/notes/00000000-0000-0000-0000-000000000000");

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("PATCH /notes/:id", () => {
    it("should update note title", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.patch(`/notes/${noteId}`, {
        title: "Updated Integration Note",
      });

      expect(res.status).toBe(200);
      expect(res.data.title).toBe("Updated Integration Note");
    });

    it("should update note content", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.patch(`/notes/${noteId}`, {
        content: "Updated content from integration test",
      });

      expect(res.status).toBe(200);
      expect(res.data.content).toBe("Updated content from integration test");
    });

    it("should update both title and content", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.patch(`/notes/${noteId}`, {
        title: "Final Title",
        content: "Final content",
      });

      expect(res.status).toBe(200);
      expect(res.data.title).toBe("Final Title");
      expect(res.data.content).toBe("Final content");
    });
  });

  describe("DELETE /notes/:id", () => {
    it("should delete a note", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.delete(`/notes/${noteId}`);

      expect(res.status).toBeLessThan(500);
    });

    it("should confirm note is deleted", async () => {
      const client = createClient(tokens.access_token);
      const res = await client.get(`/notes/${noteId}`);

      expect(res.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe("Data isolation", () => {
    it("should not return notes from other users", async () => {
      // Create a second user
      const otherEmail = `other-${RUN_ID}@integration.test`;
      const otherTokens = await getOrCreateTestUser(otherEmail, TEST_PASSWORD);

      // Create a note as the other user
      const otherClient = createClient(otherTokens.access_token);
      const createRes = await otherClient.post("/notes", {
        title: "Other User Note",
      });
      expect(createRes.status).toBe(200);
      const otherNoteId = createRes.data.id;

      // Verify the original user cannot see it
      const client = createClient(tokens.access_token);
      const listRes = await client.get("/notes");
      const found = listRes.data.find(
        (n: { id: string }) => n.id === otherNoteId
      );
      expect(found).toBeUndefined();

      // Clean up
      await otherClient.delete(`/notes/${otherNoteId}`);
    });
  });
});
