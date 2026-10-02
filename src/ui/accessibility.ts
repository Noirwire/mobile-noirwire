import { Platform } from "react-native";

/**
 * Makes a view one screen-reader element that reads its children together.
 * Native only: on the web the role and label already do this, and the DOM has
 * no such attribute.
 */
export const readAsOne = Platform.OS === "web" ? {} : { accessible: true };
