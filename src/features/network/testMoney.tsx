import {
  createBalanceRefresh,
  createPendingActions,
  type CostChain,
  type EarnChain,
  type SendChain,
} from "@noirwire/shared/application";
import {
  ChainError,
  UnknownOutcomeError,
  failureReason,
  type Portfolio,
  type Wallet,
} from "@noirwire/shared/domain";
import { deriveKeypair, isRecipientAddress } from "@noirwire/shared/infrastructure";
import { getPlatform } from "@noirwire/shared/platform";
import { failureMessage, pendingWords } from "@noirwire/shared/presentation";
import {
  catalog,
  createPortfolio,
  createWallet,
  getSnapshot,
  isUnlocked,
  serialised,
  storeNewWallet,
  subscribe,
  syncFromStorage,
  unlockedSession,
  updateWallet,
} from "@noirwire/shared/wallet";
import type { Keypair } from "@solana/web3.js";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import type { Unsendable } from "../send/recipientCheck";
import { renderWith, STRONG_PASSWORD } from "../testServices";
import type { AppServices } from "../services";
import { MoneyProvider, type Money } from "./money";
import { processLocks } from "./processLocks";

/**
 * Stand-ins for every client the money screens reach: balances in a map,
 * a relayer that quotes a fee or refuses, a settlement service, a lending
 * venue and a recipient reading. Nothing is signed or sent: each "send"
 * only records what it was asked to do and moves the numbers in the map.
 * The use cases, the pending-action record and the wallet store are the
 * real shared ones, over the in-memory vault.
 */
export type FakeChain = {
  /** Balances by address, then by symbol. */
  balances: Map<string, Record<string, number>>;
  /** The relayer's fee in raw USDC units, or null while the relayer cannot be used. */
  relayerFeeRaw: bigint | null;
  opensAccount: boolean;
  /** How a private transfer answers: it lands, it is never answered, or the service refuses it. */
  privateTransfer: "lands" | "unknown" | "refused" | "neverArrives";
  /** How a relayed send or Earn move answers. */
  relayed: "lands" | "unknown" | "costRose";
  recipient: Unsendable | null;
  /** What the chain says about an unsettled action. */
  settles: "pending" | "landed" | "expired";
  earn: {
    available: boolean;
    rate: { apy: number; supplyApy: number; rewardsApy: number } | null;
    deposited: Map<string, number>;
    unreadable: Set<string>;
  };
  calls: { kind: string; amount: number; to?: string }[];
};

export function fakeChain(): FakeChain {
  return {
    balances: new Map(),
    relayerFeeRaw: 20_000n,
    opensAccount: false,
    privateTransfer: "lands",
    relayed: "lands",
    recipient: null,
    settles: "pending",
    earn: {
      available: true,
      rate: { apy: 4.16, supplyApy: 3.79, rewardsApy: 0.37 },
      deposited: new Map(),
      unreadable: new Set(),
    },
    calls: [],
  };
}

const USDC = "USDC";
const UNIT = 1_000_000;

function balanceIn(chain: FakeChain, address: string, symbol: string) {
  return chain.balances.get(address)?.[symbol] ?? 0;
}

function setBalance(chain: FakeChain, address: string, symbol: string, amount: number) {
  chain.balances.set(address, { ...chain.balances.get(address), [symbol]: amount });
}

const track: Money["deps"]["track"] = (name, data) =>
  (getPlatform().track as (name: string, data?: object) => void)(name, data);

const store = { snapshot: getSnapshot, update: updateWallet, isUnlocked, serialised };

export function testMoney(chain: FakeChain): Money {
  const pending = createPendingActions({
    store: {
      snapshot: getSnapshot,
      update: updateWallet,
      sync: syncFromStorage,
      serialised,
      subscribe,
    },
    locks: processLocks(),
    settle: async () => chain.settles,
    prices: catalog,
  });

  const quote = async () => {
    if (chain.relayerFeeRaw === null) throw new Error("relayer unavailable");
    return { feeRaw: chain.relayerFeeRaw, opensAccount: chain.opensAccount };
  };

  const relayed = async (kind: string, amount: number, move: () => void, to?: string) => {
    chain.calls.push({ kind, amount, to });
    if (chain.relayed === "unknown") throw new UnknownOutcomeError("fake-signature", 100);
    if (chain.relayed === "costRose") throw new ChainError("networkCostRose");
    move();
    return "fake-signature";
  };

  const cost: CostChain = {
    balance: async () => 0,
    shortfall: async (_balance, lamports) => ({ required: lamports }),
  };

  const sendChain: SendChain<Keypair> = {
    asset: (symbol) => ({
      symbol,
      balance: async (owner) => balanceIn(chain, owner, symbol),
      ensureAccount: async () => undefined,
      deposit: async () => undefined,
      withdraw: async () => {
        throw new Error("A send on the phone always goes through the relayer.");
      },
      sendRelayed: ({ owner, to, amount, reviewedFeeRaw }) =>
        relayed(
          "send",
          amount,
          () => {
            const from = owner.publicKey.toBase58();
            const fee = Number(reviewedFeeRaw) / UNIT;
            setBalance(chain, from, symbol, balanceIn(chain, from, symbol) - amount);
            setBalance(chain, from, USDC, balanceIn(chain, from, USDC) - fee);
          },
          to,
        ),
    }),
    token: (symbol) => ({
      symbol,
      decimals: 6,
      sendLamports: async () => 5_000,
      quoteRelayed: quote,
    }),
    isRecipientAddress,
    cashSymbol: USDC,
    networkFeeSol: 0.000005,
    cost,
  };

  const earnChain: EarnChain<Keypair> = {
    available: () => chain.earn.available,
    move: async () => {
      throw new Error("Earn on the phone always goes through the relayer.");
    },
    moveRelayed: ({ action, owner, amount, reviewedFeeRaw }) =>
      relayed(action, amount, () => {
        const address = owner.publicKey.toBase58();
        const fee = Number(reviewedFeeRaw) / UNIT;
        const lent = chain.earn.deposited.get(address) ?? 0;
        const cash = balanceIn(chain, address, USDC);
        const sign = action === "deposit" ? 1 : -1;
        chain.earn.deposited.set(address, lent + sign * amount);
        setBalance(chain, address, USDC, cash - sign * amount - fee);
      }),
    quoteRelayed: quote,
    cashSymbol: USDC,
    cost,
  };

  return {
    deps: {
      session: unlockedSession,
      store,
      prices: catalog,
      track,
      failureBand: (result) => failureReason(failureMessage(result)),
      pending: { reserve: pending.reserve },
      words: pendingWords(catalog.shownUnits),
    },
    refresh: createBalanceRefresh({
      store,
      chain: {
        balanceOf: async (address, symbol) => balanceIn(chain, address, symbol),
        portfolioBalances: async (address) => ({
          cash: { SOL: 0, USDC: balanceIn(chain, address, USDC) },
          trackers: {},
        }),
        cashBalances: async (address) => ({ SOL: 0, USDC: balanceIn(chain, address, USDC) }),
      },
      prices: catalog,
      track,
      shuffle: (items) => items,
    }),
    privateToken: (symbol) =>
      symbol !== USDC
        ? undefined
        : {
            symbol,
            balance: async (owner) => balanceIn(chain, owner, USDC),
            async sendPrivately({ sender, to, amount }) {
              chain.calls.push({ kind: "private", amount, to });
              if (chain.privateTransfer === "unknown") throw new UnknownOutcomeError();
              if (chain.privateTransfer === "refused") {
                throw new Error(
                  "This transfer would name one of your portfolios on chain next to your funding wallet. Not signed.",
                );
              }
              const from = sender.publicKey.toBase58();
              const fee = Math.ceil(amount * 10) / 10_000 + 0.2;
              setBalance(chain, from, USDC, balanceIn(chain, from, USDC) - amount - fee);
              if (chain.privateTransfer === "lands") {
                setBalance(chain, to, USDC, balanceIn(chain, to, USDC) + amount);
              }
              return { signature: "fake-signature", feeTokens: Math.round(fee * UNIT) / UNIT };
            },
            nudgeSettlement: async () => undefined,
          },
    sendChain,
    earnChain,
    earnVenue: {
      name: "Jupiter Lend",
      async rate() {
        if (!chain.earn.rate) throw new Error("no rate");
        return chain.earn.rate;
      },
      async position(address) {
        if (chain.earn.unreadable.has(address)) throw new Error("unreadable");
        return {
          deposited: chain.earn.deposited.get(address) ?? 0,
          earnedSinceDeposit: null,
          hasReceiptAccount: true,
          lamports: 0,
        };
      },
      lamportsNeeded: () => 50_000,
    },
    checkRecipient: async () => chain.recipient,
    pending,
    cashSymbol: USDC,
  };
}

const METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

/** A screen with its services, its money clients and a phone's safe area. */
export function renderWithMoney(services: AppServices, money: Money, ui: ReactElement) {
  return renderWith(
    services,
    <SafeAreaProvider initialMetrics={METRICS}>
      <MoneyProvider money={money}>{ui}</MoneyProvider>
    </SafeAreaProvider>,
  );
}

type Setup = {
  /** The funding wallet's USDC. */
  funding?: number;
  /** Each portfolio's label and cash; the first is the one a created wallet comes with. */
  portfolios?: { label: string; cash: number }[];
};

/**
 * An unlocked wallet with the given balances, stored in the shared store and
 * mirrored into `chain`, so a refresh reads back what the wallet shows.
 */
export async function walletWith(chain: FakeChain, setup: Setup = {}): Promise<Wallet> {
  const { funding = 500, portfolios = [{ label: "Investing", cash: 457.33 }] } = setup;
  const draft = createWallet();
  const mnemonic = draft.phrase.join(" ");
  const [first] = draft.wallet.portfolios;
  const extra: Portfolio[] = portfolios.slice(1).map((entry, index) => {
    const derivationIndex = first.derivationIndex + index + 1;
    const key = deriveKeypair(mnemonic, derivationIndex, draft.wallet.derivationScheme);
    return createPortfolio(entry.label, key.publicKey.toBase58(), derivationIndex);
  });
  const all = [first, ...extra].map((portfolio, index) => ({
    ...portfolio,
    label: portfolios[index].label,
    holdings: portfolio.holdings.map((holding) =>
      holding.symbol === USDC
        ? { ...holding, amount: portfolios[index].cash, cost: portfolios[index].cash }
        : holding,
    ),
  }));
  const wallet: Wallet = {
    ...draft.wallet,
    funding: { ...draft.wallet.funding, tokens: { ...draft.wallet.funding.tokens, USDC: funding } },
    portfolios: all,
  };
  setBalance(chain, wallet.funding.address, USDC, funding);
  for (const portfolio of all) {
    setBalance(chain, portfolio.address, USDC, portfolios[all.indexOf(portfolio)].cash);
  }
  await storeNewWallet(wallet, draft.phrase, STRONG_PASSWORD);
  return getSnapshot() ?? wallet;
}
