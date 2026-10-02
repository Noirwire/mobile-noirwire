import { setUpTests } from "react-native-reanimated";

jest.mock("react-native-worklets", () => jest.requireActual("react-native-worklets/src/mock"));

jest.mock("expo-haptics", () => ({
  ImpactFeedbackStyle: { Light: "light" },
  impactAsync: jest.fn(() => Promise.resolve()),
}));

setUpTests();
