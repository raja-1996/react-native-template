import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  Message,
  PaginatedMessages,
  Room,
  messagesApi,
  roomsApi,
} from "../services/notes";

// --- Rooms ---

export function useRooms() {
  return useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: roomsApi.list,
  });
}

export function useRoom(id: string) {
  return useQuery<Room>({
    queryKey: ["rooms", id],
    queryFn: () => roomsApi.get(id),
    enabled: !!id,
  });
}

export function useCreateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: roomsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string }) =>
      roomsApi.update(id, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
      queryClient.invalidateQueries({ queryKey: ["rooms", variables.id] });
    },
  });
}

export function useDeleteRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: roomsApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

// --- Messages (with cursor pagination) ---

export function useMessages(roomId: string) {
  return useInfiniteQuery<PaginatedMessages>({
    queryKey: ["messages", roomId],
    queryFn: ({ pageParam }) =>
      messagesApi.list(roomId, pageParam as string | undefined),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.has_more ? lastPage.next_cursor : undefined,
    enabled: !!roomId,
  });
}

export function useCreateMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roomId,
      ...data
    }: {
      roomId: string;
      content?: string;
      image_path?: string | null;
    }) => messagesApi.create(roomId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.roomId],
      });
    },
  });
}

export function useUpdateMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roomId,
      messageId,
      ...data
    }: {
      roomId: string;
      messageId: string;
      content?: string;
    }) => messagesApi.update(roomId, messageId, data),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.roomId],
      });
    },
  });
}

export function useDeleteMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      roomId,
      messageId,
    }: {
      roomId: string;
      messageId: string;
    }) => messagesApi.delete(roomId, messageId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", variables.roomId],
      });
    },
  });
}
