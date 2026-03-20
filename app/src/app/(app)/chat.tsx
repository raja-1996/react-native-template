import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  useCreateMessage,
  useDeleteMessage,
  useMessages,
} from "@/hooks/use-notes";
import { useRealtimeMessages } from "@/hooks/use-realtime-notes";
import { Message, storageApi } from "@/services/notes";
import { useAuthStore } from "@/stores/auth-store";

export default function ChatScreen() {
  const { id: roomId, name: roomName } = useLocalSearchParams<{
    id: string;
    name: string;
  }>();
  const user = useAuthStore((s) => s.user);
  const userId = user?.id ?? "";

  const {
    data: messagesData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(roomId);
  const createMessage = useCreateMessage();
  const deleteMessage = useDeleteMessage();

  // Realtime
  useRealtimeMessages(roomId);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // Flatten paginated messages and reverse for chronological order in inverted list
  const messages = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.data);
  }, [messagesData]);

  const handleSend = useCallback(async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await createMessage.mutateAsync({ roomId, content });
      setText("");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to send";
      Alert.alert("Error", message);
    } finally {
      setSending(false);
    }
  }, [text, roomId, createMessage]);

  const handlePickImage = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const filename = asset.fileName || `image-${Date.now()}.jpg`;
        setSending(true);
        try {
          const upload = await storageApi.uploadImage(asset.uri, filename);
          await createMessage.mutateAsync({
            roomId,
            content: "",
            image_path: upload.path,
          });
        } catch (e: unknown) {
          const message = e instanceof Error ? e.message : "Upload failed";
          Alert.alert("Error", message);
        } finally {
          setSending(false);
        }
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to pick image";
      Alert.alert("Error", message);
    }
  }, [roomId, createMessage]);

  const handleDelete = useCallback(
    (messageId: string) => {
      Alert.alert("Delete Message", "Are you sure?", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteMessage.mutate({ roomId, messageId }),
        },
      ]);
    },
    [roomId, deleteMessage]
  );

  const renderMessage = useCallback(
    ({ item }: { item: Message }) => {
      const isOwn = item.user_id === userId;
      return (
        <Pressable
          style={[
            styles.messageBubble,
            isOwn ? styles.ownBubble : styles.otherBubble,
          ]}
          onLongPress={() => isOwn && handleDelete(item.id)}
        >
          {!isOwn && (
            <Text style={styles.senderName}>
              {item.user_id.slice(0, 8)}
            </Text>
          )}
          {item.image_path && (
            <Image
              source={{ uri: item.image_path }}
              style={styles.messageImage}
              resizeMode="cover"
            />
          )}
          {item.content ? (
            <Text
              style={[
                styles.messageText,
                isOwn ? styles.ownText : styles.otherText,
              ]}
            >
              {item.content}
            </Text>
          ) : null}
          <Text style={styles.messageTime}>
            {new Date(item.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </Text>
        </Pressable>
      );
    },
    [userId, handleDelete]
  );

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messageList}
        inverted
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
        onEndReachedThreshold={0.3}
        ListFooterComponent={
          isFetchingNextPage ? (
            <ActivityIndicator style={{ padding: 16 }} />
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>Say something!</Text>
          </View>
        }
      />

      <View style={styles.inputBar}>
        <Pressable style={styles.imageButton} onPress={handlePickImage}>
          <Text style={styles.imageButtonText}>+</Text>
        </Pressable>
        <TextInput
          style={styles.textInput}
          placeholder="Type a message..."
          value={text}
          onChangeText={setText}
          multiline
          maxLength={2000}
          placeholderTextColor="#999"
        />
        <Pressable
          style={[styles.sendButton, sending && styles.buttonDisabled]}
          onPress={handleSend}
          disabled={sending || !text.trim()}
        >
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f5f5f5" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  messageList: { padding: 16, gap: 8 },
  messageBubble: {
    maxWidth: "80%",
    borderRadius: 16,
    padding: 12,
    marginVertical: 2,
  },
  ownBubble: {
    backgroundColor: "#111",
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    backgroundColor: "#fff",
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  senderName: { fontSize: 11, color: "#999", marginBottom: 4, fontWeight: "600" },
  messageText: { fontSize: 15, lineHeight: 20 },
  ownText: { color: "#fff" },
  otherText: { color: "#111" },
  messageTime: { fontSize: 10, color: "#999", marginTop: 4, alignSelf: "flex-end" },
  messageImage: { width: 200, height: 150, borderRadius: 12, marginBottom: 4 },
  empty: { alignItems: "center", marginTop: 100, transform: [{ scaleY: -1 }] },
  emptyText: { fontSize: 18, color: "#999", fontWeight: "600" },
  emptySubtext: { fontSize: 14, color: "#bbb", marginTop: 4 },
  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    padding: 12,
    gap: 8,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  imageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
  },
  imageButtonText: { fontSize: 22, color: "#666", lineHeight: 24 },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    backgroundColor: "#f9f9f9",
  },
  sendButton: {
    backgroundColor: "#111",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "600", fontSize: 15 },
  buttonDisabled: { opacity: 0.4 },
});
