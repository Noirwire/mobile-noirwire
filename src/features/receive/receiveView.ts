import { commonCopy, portfolioCopy } from "@noirwire/shared/copy";
import type { Env } from "@noirwire/shared/platform";
import type { Wallet } from "@noirwire/shared/domain";
import { mobileReceiveCopy as copy } from "./copy";

/** Whose address the sheet shows: the funding wallet, or one portfolio by its id. */
export type ReceiveTarget =
  { kind: "funding"; reveal: boolean } | { kind: "portfolio"; id: string };

export type ReceiveView =
  | {
      kind: "address";
      title: string;
      notice: string;
      /** The address starts hidden behind a Panel and "Show address". */
      masked: { text: string; show: string } | null;
      address: string;
      qrLabel: string;
      copy: string;
      copied: string;
      notes: string[];
      /** Which address a copy counts as, for usage analytics. */
      what: "funding" | "portfolio";
    }
  | { kind: "unavailable"; title: string; message: string };

/**
 * Spec 2.15: one address, as text and as a QR code, with the one warning that
 * applies to it. Never both addresses on one sheet.
 */
export function receiveView(
  wallet: Wallet,
  target: ReceiveTarget,
  network: Env["network"],
): ReceiveView {
  if (target.kind === "funding") {
    return {
      kind: "address",
      title: copy.fundingTitle,
      notice: portfolioCopy.addMoney.stepSendDetail,
      masked: target.reveal ? null : { text: copy.hiddenFunding, show: copy.showAddress },
      address: wallet.funding.address,
      qrLabel: copy.qrFunding,
      copy: copy.copyAddress,
      copied: copy.copied,
      notes: [portfolioCopy.addMoney.onlyUsdc(commonCopy.solana), copy.afterArrival],
      what: "funding",
    };
  }
  const portfolio = wallet.portfolios.find((entry) => entry.id === target.id);
  if (!portfolio)
    return { kind: "unavailable", title: portfolioCopy.receive.title, message: copy.missing };
  const title = copy.portfolioTitle(portfolio.label);
  if (portfolio.archivedAt !== null) return { kind: "unavailable", title, message: copy.archived };
  const tail =
    network === "mainnet-beta" ? portfolioCopy.receive.mainnet : portfolioCopy.receive.testNetwork;
  return {
    kind: "address",
    title,
    notice: copy.portfolioNotice,
    masked: null,
    address: portfolio.address,
    qrLabel: copy.qrPortfolio(portfolio.label),
    copy: copy.copyAddress,
    copied: copy.copied,
    notes: [portfolioCopy.receive.lead(portfolio.label, commonCopy.solana) + tail],
    what: "portfolio",
  };
}
