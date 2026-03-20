/**
 * Integration test config — runs tests against a real backend.
 *
 * Usage:
 *   API_URL=http://localhost:8000 npx jest --config jest.integration.config.js
 *
 * Required env vars:
 *   API_URL          – base URL of the running backend (e.g. http://localhost:8000)
 *   TEST_USER_EMAIL  – email of an existing test user  (optional — will be created if missing)
 *   TEST_USER_PASSWORD – password for the test user     (optional — defaults to "Test1234!")
 */
module.exports = {
  preset: "jest-expo",
  testMatch: ["**/__tests__/integration/**/*.test.{ts,tsx}"],
  transformIgnorePatterns: [
    "node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|react-navigation|@react-navigation/.*|@tanstack/.*|zustand|axios)",
  ],
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@/assets/(.*)$": "<rootDir>/assets/$1",
  },
  testTimeout: 30000,
};
