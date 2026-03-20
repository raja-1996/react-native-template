import { router } from "expo-router";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useCreateRoom, useDeleteRoom, useRooms } from "@/hooks/use-notes";
import { Room } from "@/services/notes";
import { useAuthStore } from "@/stores/auth-store";

export default function RoomsScreen() {
  const { data: rooms, isLoading, refetch } = useRooms();
  const createRoom = useCreateRoom();
  const deleteRoom = useDeleteRoom();
  const logout = useAuthStore((s) => s.logout);

  const [showModal, setShowModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const [creating, setCreating] = useState(false);

  const handleCreate = useCallback(async () => {
    if (!newRoomName.trim()) {
      Alert.alert("Error", "Room name is required");
      return;
    }
    setCreating(true);
    try {
      await createRoom.mutateAsync({ name: newRoomName.trim() });
      setNewRoomName("");
      setShowModal(false);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to create room";
      Alert.alert("Error", message);
    } finally {
      setCreating(false);
    }
  }, [newRoomName, createRoom]);

  const handleOpenChat = useCallback((room: Room) => {
    router.push({ pathname: "/(app)/chat", params: { id: room.id, name: room.name } });
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      Alert.alert("Delete Room", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteRoom.mutate(id),
        },
      ]);
    },
    [deleteRoom]
  );

  const handleLogout = useCallback(async () => {
    await logout();
    router.replace("/");
  }, [logout]);

  const handleSettings = useCallback(() => {
    router.push("/(app)/settings");
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: Room }) => (
      <Pressable style={styles.roomCard} onPress={() => handleOpenChat(item)}>
        <View style={styles.roomContent}>
          <Text style={styles.roomName} numberOfLines={1}>
            {item.name}
          </Text>
          <Text style={styles.roomDate}>
            {new Date(item.updated_at).toLocaleDateString()}
          </Text>
        </View>
        <Pressable
          style={styles.deleteButton}
          onPress={() => handleDelete(item.id)}
        >
          <Text style={styles.deleteText}>x</Text>
        </Pressable>
      </Pressable>
    ),
    [handleOpenChat, handleDelete]
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
        <Pressable onPress={handleSettings} style={styles.headerButton}>
          <Text style={styles.settingsText}>Settings</Text>
        </Pressable>
        <Pressable onPress={handleLogout} style={styles.headerButton}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>

      <FlatList
        data={rooms}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No rooms yet</Text>
            <Text style={styles.emptySubtext}>
              Tap + to create your first chat room
            </Text>
          </View>
        }
        onRefresh={refetch}
        refreshing={isLoading}
      />

      <Pressable style={styles.fab} onPress={() => setShowModal(true)}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <Modal
        visible={showModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowModal(false)}
        >
          <View
            style={styles.modalContent}
            onStartShouldSetResponder={() => true}
          >
            <Text style={styles.modalTitle}>New Room</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Room name"
              value={newRoomName}
              onChangeText={setNewRoomName}
              placeholderTextColor="#999"
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => setShowModal(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[
                  styles.modalCreate,
                  creating && styles.buttonDisabled,
                ]}
                onPress={handleCreate}
                disabled={creating}
              >
                <Text style={styles.modalCreateText}>
                  {creating ? "Creating..." : "Create"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Pressable>
      </Modal>
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
    gap: 16,
  },
  headerButton: { padding: 8 },
  settingsText: { color: "#111", fontSize: 14, fontWeight: "600" },
  logoutText: { color: "#e33", fontSize: 14, fontWeight: "600" },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  roomCard: {
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
  roomContent: { flex: 1, gap: 4 },
  roomName: { fontSize: 16, fontWeight: "600", color: "#111" },
  roomDate: { fontSize: 12, color: "#999", marginTop: 4 },
  deleteButton: { padding: 8, marginLeft: 8 },
  deleteText: { fontSize: 20, color: "#ccc", fontWeight: "300" },
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
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    width: "85%",
    gap: 16,
  },
  modalTitle: { fontSize: 20, fontWeight: "700", color: "#111" },
  modalInput: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  modalButtons: { flexDirection: "row", gap: 12 },
  modalCancel: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  modalCancelText: { fontSize: 16, color: "#666", fontWeight: "600" },
  modalCreate: {
    flex: 1,
    padding: 14,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#111",
  },
  modalCreateText: { fontSize: 16, color: "#fff", fontWeight: "600" },
  buttonDisabled: { opacity: 0.6 },
});
