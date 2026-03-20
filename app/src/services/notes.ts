import api from "../lib/api";

// --- Types ---

export interface Room {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface RoomMember {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: string;
}

export interface Message {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  image_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaginatedMessages {
  data: Message[];
  next_cursor: string | null;
  has_more: boolean;
}

// --- Rooms API ---

export const roomsApi = {
  list: async (): Promise<Room[]> => {
    const { data } = await api.get("/rooms");
    return data;
  },

  get: async (id: string): Promise<Room> => {
    const { data } = await api.get(`/rooms/${id}`);
    return data;
  },

  create: async (room: { name: string }): Promise<Room> => {
    const { data } = await api.post("/rooms", room);
    return data;
  },

  update: async (id: string, room: { name?: string }): Promise<Room> => {
    const { data } = await api.patch(`/rooms/${id}`, room);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/rooms/${id}`);
  },

  listMembers: async (roomId: string): Promise<RoomMember[]> => {
    const { data } = await api.get(`/rooms/${roomId}/members`);
    return data;
  },

  addMember: async (roomId: string, userId: string): Promise<RoomMember> => {
    const { data } = await api.post(`/rooms/${roomId}/members/${userId}`);
    return data;
  },

  removeMember: async (roomId: string, userId: string): Promise<void> => {
    await api.delete(`/rooms/${roomId}/members/${userId}`);
  },
};

// --- Messages API ---

export const messagesApi = {
  list: async (
    roomId: string,
    cursor?: string | null,
    limit?: number
  ): Promise<PaginatedMessages> => {
    const params: Record<string, string> = {};
    if (cursor) params.cursor = cursor;
    if (limit) params.limit = String(limit);
    const { data } = await api.get(`/rooms/${roomId}/messages`, { params });
    return data;
  },

  create: async (
    roomId: string,
    message: { content?: string; image_path?: string | null }
  ): Promise<Message> => {
    const { data } = await api.post(`/rooms/${roomId}/messages`, message);
    return data;
  },

  update: async (
    roomId: string,
    messageId: string,
    message: { content?: string }
  ): Promise<Message> => {
    const { data } = await api.patch(
      `/rooms/${roomId}/messages/${messageId}`,
      message
    );
    return data;
  },

  delete: async (roomId: string, messageId: string): Promise<void> => {
    await api.delete(`/rooms/${roomId}/messages/${messageId}`);
  },
};

// --- Storage API ---

export const storageApi = {
  uploadImage: async (uri: string, filename: string) => {
    const form = new FormData();
    form.append("file", {
      uri,
      name: filename,
      type: "image/jpeg",
    } as unknown as Blob);
    const { data } = await api.post("/storage/upload", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data as { path: string; url: string };
  },

  getImageUrl: async (filePath: string): Promise<string> => {
    const { data } = await api.get(`/storage/url/${filePath}`);
    return data.url;
  },

  deleteImage: async (filePath: string): Promise<void> => {
    await api.delete(`/storage/delete/${filePath}`);
  },
};
