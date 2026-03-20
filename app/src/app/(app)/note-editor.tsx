import * as DocumentPicker from "expo-document-picker";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { useCreateNote, useNote, useUpdateNote } from "@/hooks/use-notes";
import { notesApi } from "@/services/notes";

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEditing = !!id;

  const { data: existingNote } = useNote(id || "");
  const createNote = useCreateNote();
  const updateNote = useUpdateNote();

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (existingNote) {
      setTitle(existingNote.title);
      setContent(existingNote.content);
    }
  }, [existingNote]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert("Error", "Title is required");
      return;
    }
    setSaving(true);
    try {
      if (isEditing) {
        await updateNote.mutateAsync({ id, title, content });
      } else {
        await createNote.mutateAsync({ title, content });
      }
      router.back();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to save";
      Alert.alert("Error", message);
    } finally {
      setSaving(false);
    }
  };

  const handlePickFile = async () => {
    if (!id) {
      Alert.alert("Save first", "Save the note before attaching files");
      return;
    }
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*" });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        await notesApi.uploadAttachment(id, asset.uri, asset.name);
        Alert.alert("Success", "File attached");
      }
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Upload failed";
      Alert.alert("Error", message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <TextInput
          style={styles.titleInput}
          placeholder="Note title"
          value={title}
          onChangeText={setTitle}
          placeholderTextColor="#999"
        />
        <TextInput
          style={styles.contentInput}
          placeholder="Write something..."
          value={content}
          onChangeText={setContent}
          multiline
          textAlignVertical="top"
          placeholderTextColor="#999"
        />

        {isEditing && (
          <Pressable style={styles.attachButton} onPress={handlePickFile}>
            <Text style={styles.attachText}>Attach File</Text>
          </Pressable>
        )}

        {isEditing && existingNote?.attachment_path && (
          <View style={styles.attachmentInfo}>
            <Text style={styles.attachmentLabel}>
              Attached: {existingNote.attachment_path.split("/").pop()}
            </Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.saveButton, saving && styles.buttonDisabled]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>
            {saving ? "Saving..." : "Save"}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  scroll: { flex: 1 },
  scrollContent: { padding: 24, gap: 16 },
  titleInput: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
    paddingBottom: 12,
  },
  contentInput: {
    fontSize: 16,
    color: "#333",
    minHeight: 200,
    lineHeight: 24,
  },
  attachButton: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderStyle: "dashed",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  attachText: { color: "#666", fontSize: 14, fontWeight: "500" },
  attachmentInfo: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 12,
  },
  attachmentLabel: { fontSize: 13, color: "#555" },
  footer: {
    flexDirection: "row",
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "#eee",
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelText: { fontSize: 16, color: "#666", fontWeight: "600" },
  saveButton: {
    flex: 1,
    padding: 16,
    alignItems: "center",
    borderRadius: 12,
    backgroundColor: "#111",
  },
  buttonDisabled: { opacity: 0.6 },
  saveText: { fontSize: 16, color: "#fff", fontWeight: "600" },
});
