import "react-native-gesture-handler/jestSetup";
import { setUpTests } from "react-native-reanimated";
import { fastKeyDerivation } from "./jest/keyDerivation";

jest.mock("react-native-worklets", () => jest.requireActual("react-native-worklets/src/mock"));

jest.mock("react-native-keyboard-controller", () =>
  jest.requireActual("react-native-keyboard-controller/jest"),
);

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Warning: "warning", Error: "error" },
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock("expo-screen-capture", () => ({
  preventScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  addScreenshotListener: jest.fn(() => ({ remove: jest.fn() })),
}));

// The native crypto module does not exist under Jest. Node's own PBKDF2 stands
// in for it, so the code that calls it runs against a real implementation.
jest.mock("react-native-quick-crypto", () => ({
  pbkdf2Sync: jest.requireActual("crypto").pbkdf2Sync,
  install: () => undefined,
}));

setUpTests();

fastKeyDerivation();
