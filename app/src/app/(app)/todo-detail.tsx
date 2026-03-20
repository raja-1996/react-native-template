import { useState, useEffect } from 'react';
import { StyleSheet, Alert, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { ThemedView } from '../../components/themed-view';
import { Input } from '../../components/input';
import { Button } from '../../components/button';
import { useTodo, useCreateTodo, useUpdateTodo, useDeleteTodo } from '../../hooks/use-todos';
import storageService from '../../services/storage-service';
import { useTheme } from '../../hooks/use-theme';
import { Spacing } from '../../constants/theme';

export default function TodoDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const router = useRouter();
  const colors = useTheme();
  const isNew = !id;

  const { data: todo } = useTodo(id || '');
  const createTodo = useCreateTodo();
  const updateTodo = useUpdateTodo();
  const deleteTodo = useDeleteTodo();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (todo) {
      setTitle(todo.title);
      setDescription(todo.description);
      setIsCompleted(todo.is_completed);
      setImagePath(todo.image_path);
      if (todo.image_path) {
        storageService.getUrl(todo.image_path).then(({ data }) => setImageUrl(data.url)).catch(() => {});
      }
    }
  }, [todo]);

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }
    setSaving(true);
    try {
      if (isNew) {
        await createTodo.mutateAsync({ title: title.trim(), description: description.trim() });
      } else {
        await updateTodo.mutateAsync({
          id: id!,
          data: { title: title.trim(), description: description.trim(), is_completed: isCompleted, image_path: imagePath },
        });
      }
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.detail || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Todo', 'This action cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteTodo.mutateAsync(id!);
          router.back();
        },
      },
    ]);
  };

  const handlePickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.mimeType || 'image/jpeg',
        name: asset.fileName || 'photo.jpg',
      } as any);

      try {
        const { data } = await storageService.upload(formData);
        setImagePath(data.path);
        setImageUrl(data.url);
      } catch (error: any) {
        Alert.alert('Upload Failed', error.response?.data?.detail || 'Could not upload image');
      }
    }
  };

  return (
    <ThemedView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Input
            label="Title"
            value={title}
            onChangeText={setTitle}
            placeholder="What needs to be done?"
          />

          <Input
            label="Description"
            value={description}
            onChangeText={setDescription}
            placeholder="Add details..."
            multiline
            numberOfLines={4}
            style={styles.descriptionInput}
          />

          {!isNew && (
            <Button
              title={isCompleted ? 'Mark Incomplete' : 'Mark Complete'}
              variant="outline"
              onPress={() => setIsCompleted(!isCompleted)}
              style={styles.toggleButton}
            />
          )}

          {imageUrl && (
            <Image source={{ uri: imageUrl }} style={styles.image} contentFit="cover" />
          )}

          <Button
            title="Attach Image"
            variant="outline"
            onPress={handlePickImage}
            style={styles.imageButton}
          />

          <Button title="Save" onPress={handleSave} loading={saving} style={styles.saveButton} />

          {!isNew && (
            <Button
              title="Delete Todo"
              variant="danger"
              onPress={handleDelete}
              style={styles.deleteButton}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: {
    padding: Spacing.lg,
  },
  descriptionInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  toggleButton: { marginBottom: Spacing.md },
  image: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: Spacing.md,
  },
  imageButton: { marginBottom: Spacing.md },
  saveButton: { marginTop: Spacing.sm },
  deleteButton: { marginTop: Spacing.md },
});
