import { commonCopy, marketsCopy } from "@noirwire/shared/copy";
import { Stack, useIsFocused, useLocalSearchParams, useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native/src/icons/CaretLeft";
import { MarketsScreen } from "@/features/markets/MarketsScreen";
import { UNKNOWN_TRACKER_PARAM } from "@/navigation/deepLinks";
import { IconButton } from "@/ui";
import { colors, size } from "@/ui/theme";

export default function LookAround() {
  const router = useRouter();
  const focused = useIsFocused();
  const params = useLocalSearchParams<{ [UNKNOWN_TRACKER_PARAM]?: string }>();
  const toWelcome = () => router.replace("/welcome");
  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <IconButton label={commonCopy.back} onPress={toWelcome}>
              <CaretLeftIcon size={size.icon} color={colors.ink} />
            </IconButton>
          ),
        }}
      />
      <MarketsScreen
        focused={focused}
        unknownTracker={params[UNKNOWN_TRACKER_PARAM] === "1"}
        onOpen={(symbol) => router.push({ pathname: "/tracker/[symbol]", params: { symbol } })}
        visitor={{ createLabel: marketsCopy.detail.createWallet, onCreate: toWelcome }}
      />
    </>
  );
}
