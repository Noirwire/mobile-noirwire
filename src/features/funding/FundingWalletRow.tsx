import { ListRow } from "@/ui";
import { useWalletSnapshot } from "../network/useWalletSnapshot";
import { fundingWalletRow } from "./fundingWalletView";

/** Settings' "Funding wallet" row: its cash as last read, leading to its page. Never its address. */
export function FundingWalletRow({ onPress }: { onPress: () => void }) {
  const wallet = useWalletSnapshot();
  const row = fundingWalletRow(wallet?.funding.tokens.USDC);
  return <ListRow label={row.label} value={row.value} onPress={onPress} />;
}

/** The title of the Settings section the row sits in. */
export const FUNDING_WALLET_SECTION = fundingWalletRow(undefined).section;
