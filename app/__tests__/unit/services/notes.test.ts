import api from "@/lib/api";
import { messagesApi, roomsApi, storageApi } from "@/services/notes";

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

const mockRoom = {
  id: "room-1",
  name: "General",
  created_by: "user-1",
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockMessage = {
  id: "msg-1",
  room_id: "room-1",
  user_id: "user-1",
  content: "Hello",
  image_path: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("roomsApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should fetch all rooms", async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [mockRoom] });

      const result = await roomsApi.list();

      expect(mockedApi.get).toHaveBeenCalledWith("/rooms");
      expect(result).toEqual([mockRoom]);
    });

    it("should return empty array when no rooms", async () => {
      mockedApi.get.mockResolvedValueOnce({ data: [] });

      const result = await roomsApi.list();

      expect(result).toEqual([]);
    });
  });

  describe("get", () => {
    it("should fetch a single room by id", async () => {
      mockedApi.get.mockResolvedValueOnce({ data: mockRoom });

      const result = await roomsApi.get("room-1");

      expect(mockedApi.get).toHaveBeenCalledWith("/rooms/room-1");
      expect(result).toEqual(mockRoom);
    });
  });

  describe("create", () => {
    it("should create a room", async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockRoom });

      const result = await roomsApi.create({ name: "General" });

      expect(mockedApi.post).toHaveBeenCalledWith("/rooms", { name: "General" });
      expect(result.name).toBe("General");
    });
  });

  describe("update", () => {
    it("should update a room", async () => {
      const updated = { ...mockRoom, name: "Renamed" };
      mockedApi.patch.mockResolvedValueOnce({ data: updated });

      const result = await roomsApi.update("room-1", { name: "Renamed" });

      expect(mockedApi.patch).toHaveBeenCalledWith("/rooms/room-1", { name: "Renamed" });
      expect(result.name).toBe("Renamed");
    });
  });

  describe("delete", () => {
    it("should delete a room", async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: undefined });

      await roomsApi.delete("room-1");

      expect(mockedApi.delete).toHaveBeenCalledWith("/rooms/room-1");
    });
  });
});

describe("messagesApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("list", () => {
    it("should fetch messages for a room", async () => {
      const page = { data: [mockMessage], next_cursor: null, has_more: false };
      mockedApi.get.mockResolvedValueOnce({ data: page });

      const result = await messagesApi.list("room-1");

      expect(mockedApi.get).toHaveBeenCalledWith("/rooms/room-1/messages", { params: {} });
      expect(result.data).toEqual([mockMessage]);
    });

    it("should pass cursor and limit params", async () => {
      const page = { data: [], next_cursor: null, has_more: false };
      mockedApi.get.mockResolvedValueOnce({ data: page });

      await messagesApi.list("room-1", "2026-01-01T00:00:00Z", 10);

      expect(mockedApi.get).toHaveBeenCalledWith("/rooms/room-1/messages", {
        params: { cursor: "2026-01-01T00:00:00Z", limit: "10" },
      });
    });
  });

  describe("create", () => {
    it("should create a message", async () => {
      mockedApi.post.mockResolvedValueOnce({ data: mockMessage });

      const result = await messagesApi.create("room-1", { content: "Hello" });

      expect(mockedApi.post).toHaveBeenCalledWith("/rooms/room-1/messages", { content: "Hello" });
      expect(result.content).toBe("Hello");
    });
  });

  describe("update", () => {
    it("should update a message", async () => {
      const updated = { ...mockMessage, content: "Edited" };
      mockedApi.patch.mockResolvedValueOnce({ data: updated });

      const result = await messagesApi.update("room-1", "msg-1", { content: "Edited" });

      expect(mockedApi.patch).toHaveBeenCalledWith("/rooms/room-1/messages/msg-1", { content: "Edited" });
      expect(result.content).toBe("Edited");
    });
  });

  describe("delete", () => {
    it("should delete a message", async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: undefined });

      await messagesApi.delete("room-1", "msg-1");

      expect(mockedApi.delete).toHaveBeenCalledWith("/rooms/room-1/messages/msg-1");
    });
  });
});

describe("storageApi", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("uploadImage", () => {
    it("should upload an image as FormData", async () => {
      mockedApi.post.mockResolvedValueOnce({
        data: { path: "user-1/photo.jpg", url: "https://storage.example.com/photo.jpg" },
      });

      await storageApi.uploadImage("file:///tmp/photo.jpg", "photo.jpg");

      expect(mockedApi.post).toHaveBeenCalledWith(
        "/storage/upload",
        expect.any(FormData),
        { headers: { "Content-Type": "multipart/form-data" } }
      );
    });
  });

  describe("getImageUrl", () => {
    it("should return the image URL", async () => {
      mockedApi.get.mockResolvedValueOnce({
        data: { url: "https://storage.example.com/signed/photo.jpg" },
      });

      const result = await storageApi.getImageUrl("user-1/photo.jpg");

      expect(mockedApi.get).toHaveBeenCalledWith("/storage/url/user-1/photo.jpg");
      expect(result).toBe("https://storage.example.com/signed/photo.jpg");
    });
  });

  describe("deleteImage", () => {
    it("should delete an image", async () => {
      mockedApi.delete.mockResolvedValueOnce({ data: undefined });

      await storageApi.deleteImage("user-1/photo.jpg");

      expect(mockedApi.delete).toHaveBeenCalledWith("/storage/delete/user-1/photo.jpg");
    });
  });
});
