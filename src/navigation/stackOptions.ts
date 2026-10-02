import { colors, fonts } from "@/ui/theme";

export const stackScreenOptions = {
  headerStyle: { backgroundColor: colors.base },
  headerTintColor: colors.ink,
  headerTitleStyle: { fontFamily: fonts.medium },
  headerShadowVisible: false,
  contentStyle: { backgroundColor: colors.base },
} as const;
