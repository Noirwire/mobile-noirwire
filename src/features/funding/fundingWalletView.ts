import { symbolAmount } from "@noirwire/shared/domain";
import { mobileFundingCopy as copy } from "./copy";

const CASH = "USDC";

/** The Settings row: the funding wallet's cash, as stored (spec 2.25). */
export function fundingWalletRow(balance: number | undefined) {
  return {
    section: copy.settingsSection,
    label: copy.settingsRow,
    value: balance === undefined ? undefined : symbolAmount(CASH, balance),
  };
}

/** Settings, Funding wallet (spec 2.31): what is waiting, and where to send more. */
export function fundingWalletView(state: {
  /** Null until the first read on open has answered. */
  balance: number | null;
  readFailed: boolean;
  online: boolean;
}) {
  const { balance } = state;
  const empty = balance !== null && balance <= 0;
  return {
    waiting: copy.page.waiting,
    balance: balance === null ? null : symbolAmount(CASH, balance),
    balanceLabel: balance === null ? null : copy.page.balanceLabel(symbolAmount(CASH, balance)),
    lead: empty ? copy.page.empty : copy.page.lead,
    readFailed: state.readFailed ? copy.page.readFailed : null,
    move: { label: copy.page.move, quiet: empty, disabled: empty || balance === null },
    showAddress: copy.page.showAddress,
  };
}
