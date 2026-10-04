import { Tabs } from "expo-router/js-tabs";
import type { Icon } from "phosphor-react-native";
import { ChartLineUpIcon } from "phosphor-react-native/src/icons/ChartLineUp";
import { ClockCounterClockwiseIcon } from "phosphor-react-native/src/icons/ClockCounterClockwise";
import { GearSixIcon } from "phosphor-react-native/src/icons/GearSix";
import { HouseIcon } from "phosphor-react-native/src/icons/House";
import { MagnifyingGlassIcon } from "phosphor-react-native/src/icons/MagnifyingGlass";
import { colors, fonts } from "@/ui/theme";

const TABS: { name: string; title: string; icon: Icon }[] = [
  { name: "(home)", title: "Home", icon: HouseIcon },
  { name: "(markets)", title: "Markets", icon: MagnifyingGlassIcon },
  { name: "earn", title: "Earn", icon: ChartLineUpIcon },
  { name: "activity", title: "Activity", icon: ClockCounterClockwiseIcon },
  { name: "settings", title: "Settings", icon: GearSixIcon },
];

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.base },
        tabBarStyle: { backgroundColor: colors.base, borderTopColor: colors["line-subtle"] },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.faint,
        tabBarLabelStyle: { fontFamily: fonts.medium, fontSize: 11 },
      }}
    >
      {TABS.map(({ name, title, icon: TabIcon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarIcon: ({ focused }) => (
              <TabIcon
                size={22}
                color={focused ? colors.ink : colors.faint}
                weight={focused ? "fill" : "regular"}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
