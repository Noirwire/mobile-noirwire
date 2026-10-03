import { Stack } from "expo-router";

/** A sheet presented as its own route: the kit's Sheet draws everything, over the screen beneath. */
export function SheetRoute() {
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

/** A pushed screen that draws its own top bar. */
export function OwnTopBar() {
  return <Stack.Screen options={{ headerShown: false }} />;
}
