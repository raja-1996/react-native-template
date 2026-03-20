import { Stack } from "expo-router";
import React from "react";

export default function AppLayout() {
  return (
    <Stack>
      <Stack.Screen name="notes" options={{ title: "My Notes" }} />
      <Stack.Screen name="note-editor" options={{ title: "Note" }} />
    </Stack>
  );
}
