import "react-native";
import type { ColorValue } from "react-native";

/**
 * The browser build's switch takes the "on" thumb colour from its own prop,
 * which React Native does not declare; native platforms read `thumbColor` and
 * ignore this one.
 */
declare module "react-native" {
  interface SwitchProps {
    activeThumbColor?: ColorValue;
  }
}
