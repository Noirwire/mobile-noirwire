import { marketsCopy } from "@noirwire/shared/copy";
import { Stack, useRouter } from "expo-router";
import { CaretLeftIcon } from "phosphor-react-native/src/icons/CaretLeft";
import { MarketsScreen } from "@/features/markets/MarketsScreen";
import { mobileMarketsCopy } from "@/features/markets/copy";
import { IconButton } from "@/ui";
import { colors, size } from "@/ui/theme";

export default function LookAround() {
  const router = useRouter();
  const toWelcome = () => router.replace("/welcome");
  return (
    <>
      <Stack.Screen
        options={{
          headerLeft: () => (
            <IconButton label={mobileMarketsCopy.backToWelcome} onPress={toWelcome}>
              <CaretLeftIcon size={size.icon} color={colors.ink} />
            </IconButton>
          ),
        }}
      />
      <MarketsScreen
        onOpen={(symbol) => router.push({ pathname: "/tracker/[symbol]", params: { symbol } })}
        visitor={{ createLabel: marketsCopy.detail.createWallet, onCreate: toWelcome }}
      />
    </>
  );
}
