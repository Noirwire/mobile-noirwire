import { Stack } from "expo-router";

/**
 * A money sheet is drawn by the kit's Sheet over whatever was on screen, so
 * its route brings no header and no page of its own.
 */
export function SheetRouteOptions() {
  return (
    <Stack.Screen
      options={{
        headerShown: false,
        presentation: "transparentModal",
        animation: "none",
        contentStyle: { backgroundColor: "transparent" },
      }}
    />
  );
}

/** A route parameter as one string, or null. */
export function oneParam(value: string | string[] | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}
