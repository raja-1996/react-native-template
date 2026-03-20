import { router } from "expo-router";
import React, { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useDeleteNote, useNotes } from "@/hooks/use-notes";
import { useRealtimeNotes } from "@/hooks/use-realtime-notes";
import { Note } from "@/services/notes";
import { useAuthStore } from "@/stores/auth-store";

export default function NotesScreen() {
  const { data: notes, isLoading, refetch } = useNotes();
  const deleteNote = useDeleteNote();
  const logout = useAuthStore((s) => s.logout);

  // Subscribe to realtime updates
  useRealtimeNotes();

  const handleCreate = useCallback(() => {
    router.push({ pathname: "/(app)/note-editor" });
  }, []);

  const handleEdit = useCallback((note: Note) => {
    router.push({ pathname: "/(app)/note-editor", params: { id: note.id } });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      deleteNote.mutate(id);
    },
    [deleteNote]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/");
  }, [logout]);

  const renderItem = useCallback(
    ({ item }: { item: Note }) => (
      <Pressable style={styles.noteCard} onPress={() => handleEdit(item)}>
        <View style={styles.noteContent}>
          <Text style={styles.noteTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.notePreview} numberOfLines={2}>
            {item.content || "No content"}
          </Text>
          <Text style={styles.noteDate}>
            {new Date(item.updated_at).toLocaleDateString()}
          </Text>
          {item.attachment_path && (
            <Text style={styles.attachment}>📎 Attachment</Text>
          )}
        </View>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteText}>×</Text>
        </Pressable>
      </Pressable>
    ),
    [handleEdit, handleDelete]
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No notes yet</Text>
            <Text style={styles.emptySubtext}>
              Tap + to create your first note
            </Text>
          </View>
        }
        onRefresh={refetch}
        refreshing={isLoading}
      />
      <Pressable style={styles.fab} onPress={handleCreate}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  logoutButton: { padding: 8 },
  logoutText: { color: "#e33", fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  noteCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  noteContent: { flex: 1, gap: 4 },
  noteTitle: { fontSize: 16, fontWeight: "600", color: "#111" },
  notePreview: { fontSize: 14, color: "#666" },
  noteDate: { fontSize: 12, color: "#999", marginTop: 4 },
  attachment: { fontSize: 12, color: "#555", marginTop: 2 },
  deleteButton: { padding: 8, marginLeft: 8 },
  deleteText: { fontSize: 24, color: "#ccc", fontWeight: "300" },
  empty: { alignItems: "center", marginTop: 100 },
  emptyText: { fontSize: 18, color: "#999", fontWeight: "600" },
  emptySubtext: { fontSize: 14, color: "#bbb", marginTop: 4 },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  fabText: { fontSize: 28, color: "#fff", lineHeight: 30 },
});
