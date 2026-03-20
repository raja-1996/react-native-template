import api from "../lib/api";

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  attachment_path: string | null;
  created_at: string;
  updated_at: string;
}

export const notesApi = {
  list: async (): Promise<Note[]> => {
    const { data } = await api.get("/notes");
    return data;
  },

  get: async (id: string): Promise<Note> => {
    const { data } = await api.get(`/notes/${id}`);
    return data;
  },

  create: async (note: { title: string; content?: string }): Promise<Note> => {
    const { data } = await api.post("/notes", note);
    return data;
  },

  update: async (
    id: string,
    note: { title?: string; content?: string }
  ): Promise<Note> => {
    const { data } = await api.patch(`/notes/${id}`, note);
    return data;
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/notes/${id}`);
  },

  uploadAttachment: async (noteId: string, uri: string, filename: string) => {
    const form = new FormData();
    form.append("file", {
      uri,
      name: filename,
      type: "application/octet-stream",
    } as unknown as Blob);
    const { data } = await api.post(`/storage/upload/${noteId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return data;
  },

  getAttachmentUrl: async (noteId: string): Promise<string> => {
    const { data } = await api.get(`/storage/download/${noteId}`);
    return data.url;
  },

  deleteAttachment: async (noteId: string): Promise<void> => {
    await api.delete(`/storage/delete/${noteId}`);
  },
};
