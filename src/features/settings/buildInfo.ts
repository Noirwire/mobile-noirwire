import { mobileSettingsCopy } from "@noirwire/shared/copy";
import Constants from "expo-constants";
import { Platform } from "react-native";

export function appVersion(): string {
  return Constants.expoConfig?.version ?? "0.0.0";
}

/** The store build number, which a development build does not have. */
export function buildNumber(): string {
  const config = Constants.expoConfig;
  const build = Platform.OS === "ios" ? config?.ios?.buildNumber : config?.android?.versionCode;
  return build === undefined ? mobileSettingsCopy.about.developmentBuild : String(build);
}
