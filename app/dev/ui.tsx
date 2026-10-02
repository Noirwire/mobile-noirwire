import { Redirect } from "expo-router";

export default function DevUiKit() {
  if (__DEV__) {
    // Required inside the development branch so a production bundle, where
    // __DEV__ is the constant false, drops the gallery and everything only it uses.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Gallery } = require("@/dev/Gallery") as typeof import("@/dev/Gallery");
    return <Gallery />;
  }
  return <Redirect href="/" />;
}
