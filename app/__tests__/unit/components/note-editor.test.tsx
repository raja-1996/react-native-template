import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, waitFor } from "@testing-library/react-native";
import React from "react";
import { Alert } from "react-native";

jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  Link: ({ children }: { children: React.ReactNode }) => children,
  Redirect: () => null,
  useLocalSearchParams: jest.fn(() => ({})),
}));

jest.mock("@/hooks/use-notes", () => ({
  useNote: jest.fn(),
  useCreateNote: jest.fn(),
  useUpdateNote: jest.fn(),
}));

jest.mock("@/services/notes", () => ({
  notesApi: {
    uploadAttachment: jest.fn(),
  },
}));

import { router, useLocalSearchParams } from "expo-router";
import { useCreateNote, useNote, useUpdateNote } from "@/hooks/use-notes";
import NoteEditorScreen from "@/app/(app)/note-editor";

const mockedUseNote = useNote as jest.Mock;
const mockedUseCreateNote = useCreateNote as jest.Mock;
const mockedUseUpdateNote = useUpdateNote as jest.Mock;
const mockedUseLocalSearchParams = useLocalSearchParams as jest.Mock;

function Wrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe("NoteEditorScreen", () => {
  const mockCreateMutateAsync = jest.fn();
  const mockUpdateMutateAsync = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    mockedUseLocalSearchParams.mockReturnValue({});
    mockedUseNote.mockReturnValue({ data: undefined });
    mockedUseCreateNote.mockReturnValue({ mutateAsync: mockCreateMutateAsync });
    mockedUseUpdateNote.mockReturnValue({ mutateAsync: mockUpdateMutateAsync });
  });

  describe("Create mode", () => {
    it("should render empty form for new note", () => {
      const { getByPlaceholderText, getByText } = render(
        <Wrapper>
          <NoteEditorScreen />
        </Wrapper>
      );

      expect(getByPlaceholderText("Note title")).toBeTruthy();
      expect(getByPlaceholderText("Write something...")).toBeTruthy();
      expect(getByText("Save")).toBeTruthy();
      expect(getByText("Cancel")).toBeTruthy();
    });

    it("should show error when saving without title", async () => {
      const { getByText } = render(
        <Wrapper>
          <NoteEditorScreen />
        </Wrapper>
      );

      fireEvent.press(getByText("Save"));

      expect(Alert.alert).toHaveBeenCalledWith("Error", "Title is required");
      expect(mockCreateMutateAsync).not.toHaveBeenCalled();
    });

    it("should create note and navigate back on save", async () => {
      mockCreateMutateAsync.mockResolvedValueOnce({});

      const { getByPlaceholderText, getByText } = render(
        <Wrapper>
          <NoteEditorScreen />
        </Wrapper>
      );

      fireEvent.changeText(getByPlaceholderText("Note title"), "My Note");
      fireEvent.changeText(
        getByPlaceholderText("Write something..."),
        "My content"
      );
      fireEvent.press(getByText("Save"));

      await waitFor(() => {
        expect(mockCreateMutateAsync).toHaveBeenCalledWith({
          title: "My Note",
          content: "My content",
        });
        expect(router.back).toHaveBeenCalled();
      });
    });

    it("should show error alert on save failure", async () => {
      mockCreateMutateAsync.mockRejectedValueOnce(new Error("Server error"));

      const { getByPlaceholderText, getByText } = render(
        <Wrapper>
          <NoteEditorScreen />
        </Wrapper>
      );

      fireEvent.changeText(getByPlaceholderText("Note title"), "My Note");
      fireEvent.press(getByText("Save"));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith("Error", "Server error");
      });
    });

    it("should navigate back on cancel", () => {
      const { getByText } = render(
        <Wrapper>
          <NoteEditorScreen />
        </Wrapper>
      );

      fireEvent.press(getByText("Cancel"));
      expect(router.back).toHaveBeenCalled();
    });

    it("should not show attach button in create mode", () => {
      const { queryByText } = render(
        <Wrapper>
          <NoteEditorScreen />
        </Wrapper>
      );

      expect(queryByText("Attach File")).toBeNull();
    });
  });

  describe("Edit mode", () => {
    const existingNote = {
      id: "note-1",
      user_id: "user-1",
      title: "Existing Title",
      content: "Existing Content",
      attachment_path: "uploads/doc.pdf",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };

    beforeEach(() => {
      mockedUseLocalSearchParams.mockReturnValue({ id: "note-1" });
      mockedUseNote.mockReturnValue({ data: existingNote });
    });

    it("should populate form with existing note data", async () => {
      const { getByDisplayValue } = render(
        <Wrapper>
          <NoteEditorScreen />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByDisplayValue("Existing Title")).toBeTruthy();
        expect(getByDisplayValue("Existing Content")).toBeTruthy();
      });
    });

    it("should show attach button in edit mode", () => {
      const { getByText } = render(
        <Wrapper>
          <NoteEditorScreen />
        </Wrapper>
      );

      expect(getByText("Attach File")).toBeTruthy();
    });

    it("should show existing attachment info", () => {
      const { getByText } = render(
        <Wrapper>
          <NoteEditorScreen />
        </Wrapper>
      );

      expect(getByText("Attached: doc.pdf")).toBeTruthy();
    });

    it("should update note on save", async () => {
      mockUpdateMutateAsync.mockResolvedValueOnce({});

      const { getByText, getByDisplayValue } = render(
        <Wrapper>
          <NoteEditorScreen />
        </Wrapper>
      );

      await waitFor(() => {
        expect(getByDisplayValue("Existing Title")).toBeTruthy();
      });

      fireEvent.changeText(
        getByDisplayValue("Existing Title"),
        "Updated Title"
      );
      fireEvent.press(getByText("Save"));

      await waitFor(() => {
        expect(mockUpdateMutateAsync).toHaveBeenCalledWith({
          id: "note-1",
          title: "Updated Title",
          content: "Existing Content",
        });
        expect(router.back).toHaveBeenCalled();
      });
    });
  });
});
