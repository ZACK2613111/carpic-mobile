// AsyncStorage has no native module under Jest — use the library's official
// in-memory mock so any module that persists state (brand, query cache…) can be
// imported and tested without a device.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
