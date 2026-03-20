// Mock expo-secure-store
jest.mock("expo-secure-store", () => {
  const store = {};
  return {
    getItemAsync: jest.fn((key) => Promise.resolve(store[key] || null)),
    setItemAsync: jest.fn((key, value) => {
      store[key] = value;
      return Promise.resolve();
    }),
    deleteItemAsync: jest.fn((key) => {
      delete store[key];
      return Promise.resolve();
    }),
    __store: store,
    __clear: () => Object.keys(store).forEach((k) => delete store[k]),
  };
});

// Mock expo-router
jest.mock("expo-router", () => ({
  router: {
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useLocalSearchParams: jest.fn(() => ({})),
  Link: ({ children }) => children,
  Redirect: () => null,
}));

// Mock expo-document-picker
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: jest.fn(),
}));

// Mock @supabase/supabase-js
jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(() => ({
    channel: jest.fn(() => ({
      on: jest.fn(function () { return this; }),
      subscribe: jest.fn(function () { return this; }),
    })),
    removeChannel: jest.fn(),
  })),
}));

// Silence console.error/warn in tests (optional — remove if you want verbose output)
// jest.spyOn(console, "error").mockImplementation(() => {});
// jest.spyOn(console, "warn").mockImplementation(() => {});
