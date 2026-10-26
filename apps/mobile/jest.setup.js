/**
 * Jest setup for the mobile app (jest-expo preset).
 *
 * The official Reanimated mock covers every animation API the app uses
 * except `useReducedMotion`, so it is added here. The SafeArea mock provides
 * insets without any native module.
 */

jest.mock('react-native-reanimated', () => {
  const mock = require('react-native-reanimated/mock');
  return {
    ...mock,
    // Not exported by the official mock ("ADD ME IF NEEDED" in its source).
    useReducedMotion: () => false,
  };
});

jest.mock('react-native-safe-area-context', () =>
  // The package's jest mock is a default export.
  require('react-native-safe-area-context/jest/mock').default,
);

// lucide-react-native ships ESM-only (.mjs) which jest-expo does not
// transform; the icons are decorative and irrelevant to the behaviour under
// test, so a passthrough stub keeps the suites fast and focused.
jest.mock('lucide-react-native', () => {
  const view = () => null;
  return new Proxy({}, { get: () => view });
});

// expo-secure-store is a native module. An in-memory implementation keeps the
// auth tests hermetic while matching the async API the app uses.
jest.mock('expo-secure-store', () => {
  const store = new Map();
  return {
    getItemAsync: jest.fn(async (key) => (store.has(key) ? store.get(key) : null)),
    setItemAsync: jest.fn(async (key, value) => {
      store.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      store.delete(key);
    }),
  };
});
