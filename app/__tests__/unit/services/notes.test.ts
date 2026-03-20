import api from "@/lib/api";
import { notesApi } from "@/services/notes";

jest.mock("@/lib/api", () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedApi = api as jest.Mocked<typeof api>;

const mockNote = {
  id: "note-1",
  user_id: "user-1",
  title: "Test Note",
  content: "Test content",
  attachment_path: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("notesApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should fetch all notes", async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockNote] });

      const result = await notesApi.list();

      expect(mockedApi.get).toHaveBeenCalledWith("/notes");
      expect(result).toEqual([mockNote]);
    });

    it("should return empty array when no notes", async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      const result = await notesApi.list();

      expect(result).toEqual([]);
    });
  });

  describe("get", () => {
    it("should fetch a single note by id", async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockNote });

      const result = await notesApi.get("note-1");

      expect(mockedApi.get).toHaveBeenCalledWith("/notes/note-1");
      expect(result).toEqual(mockNote);
    });
  });

  describe("create", () => {
    it("should create a note with title and content", async () => {
      const input = { title: "New Note", content: "New content" };
      mockedApi.post.mockResolvedValueOnce({
        data: { ...mockNote, ...input },
      });

      const result = await notesApi.create(input);

      expect(mockedApi.post).toHaveBeenCalledWith("/notes", input);
      expect(result.title).toBe("New Note");
    });

    it("should create a note with only title", async () => {
      const input = { title: "Title Only" };
      mockedApi.post.mockResolvedValueOnce({
        data: { ...mockNote, title: "Title Only", content: "" },
      });

      const result = await notesApi.create(input);

      expect(mockedApi.post).toHaveBeenCalledWith("/notes", input);
      expect(result.title).toBe("Title Only");
    });
  });

  describe("update", () => {
    it("should update a note", async () => {
      const updates = { title: "Updated Title" };
      mockedApi.patch.mockResolvedValueOnce({
        data: { ...mockNote, ...updates },
      });

      const result = await notesApi.update("note-1", updates);

      expect(mockedApi.patch).toHaveBeenCalledWith("/notes/note-1", updates);
      expect(result.title).toBe("Updated Title");
    });
  });

  describe("delete", () => {
    it("should delete a note", async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: undefined });

      await notesApi.delete("note-1");

      expect(mockedApi.delete).toHaveBeenCalledWith("/notes/note-1");
    });
  });

  describe("uploadAttachment", () => {
    it("should upload a file as FormData", async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: { path: "uploads/note-1/file.pdf" },
      });

      await notesApi.uploadAttachment("note-1", "file:///tmp/file.pdf", "file.pdf");

      expect(mockedApi.post).toHaveBeenCalledWith(
        "/storage/upload/note-1",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } }
      );
    });
  });

  describe("getAttachmentUrl", () => {
    it("should return the attachment URL", async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: { url: "https://storage.example.com/file.pdf" },
      });

      const result = await notesApi.getAttachmentUrl("note-1");

      expect(mockedApi.get).toHaveBeenCalledWith("/storage/download/note-1");
      expect(result).toBe("https://storage.example.com/file.pdf");
    });
  });

  describe("deleteAttachment", () => {
    it("should delete an attachment", async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: undefined });

      await notesApi.deleteAttachment("note-1");

      expect(mockedApi.delete).toHaveBeenCalledWith("/storage/delete/note-1");
    });
  });
});
