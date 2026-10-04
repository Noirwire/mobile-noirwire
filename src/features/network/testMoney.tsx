import { createBalanceRefresh, processLocks, type CostChain } from "@noirwire/shared/application";
import {
  ChainError,
  UnknownOutcomeError,
  type Holding,
  type PendingAction,
  type PieSlice,
  type Portfolio,
  type Wallet,
} from "@noirwire/shared/domain";
import {
  ALL_STOCKS,
  connection,
  deriveKeypair,
  expectedGenesisHash,
  isRecipientAddress,
  stockBySymbol,
  type TradePlan,
} from "@noirwire/shared/infrastructure";
import { signAsClient, unsignedTransaction } from "@noirwire/shared/testing";
import {
  createPortfolio,
  createWallet,
  getSnapshot,
  installMoney,
  storeNewWallet,
} from "@noirwire/shared/wallet";
import { MintLayout, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PublicKey, type Keypair } from "@solana/web3.js";
import { Buffer } from "buffer";
import type { ReactElement } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { renderWith, STRONG_PASSWORD } from "../testServices";
import type { AppServices } from "../services";
import { recordBalanceRead } from "./balanceFreshness";
import { MoneyProvider, type Money } from "./money";

type Unsendable = Awaited<ReturnType<Money["checkRecipient"]>>;

/**
 * Stand-ins for every client the money screens reach: balances in a map,
 * a relayer that quotes a fee or refuses, a venue that prices and places
 * orders, a lending venue and a recipient reading. Nothing reaches a
 * network: each "send" signs an empty transaction through the shared signing
 * guard, as the real clients do, records what it was asked to do and moves
 * the numbers in the map. The use cases, the pending-action store, the
 * signing guard and the wallet store are the real shared ones, wired by the
 * one `installMoney`, over the in-memory vault.
 */
export type FakeChain = {
  /** Balances by address, then by symbol. */
  balances: Map<string, Record<string, number>>;
  /** The relayer's fee in raw USDC units, or null while the relayer cannot be used. */
  relayerFeeRaw: bigint | null;
  opensAccount: boolean;
  /** How a private transfer answers: it lands, it is never answered, or the service refuses it. */
  privateTransfer: "lands" | "unknown" | "refused" | "neverArrives";
  /** How a relayed send, Earn move or account opening answers. */
  relayed: "lands" | "unknown" | "costRose" | "relayerUnavailable";
  recipient: Unsendable;
  /** What the chain says about an unsettled action. */
  settles: "pending" | "landed" | "expired";
  /** The genesis hash the connection answers with, or null for the one the app is built for. */
  genesisHash: string | null;
  /** Awaited by every stand-in right before it signs, for a test to hold an action there. */
  beforeSigning: () => Promise<void>;
  trade: {
    available: boolean;
    /** Dollars per token the venue quotes. */
    price: number;
    feeBps: number | undefined;
    /** Whether the portfolio's account for a tracker exists; until it does the venue only prices. */
    holdingOpen: boolean;
    /** False for a price with no order behind it although the holding is open. */
    builds: boolean;
    /** How long a price is held. */
    heldForMs: number;
    quotes: "priced" | "none";
    /** Trackers the venue has no price for, whatever `quotes` says. */
    unpriced: Set<string>;
    /** How placing an order answers. */
    order: "lands" | "unknown" | "fails" | "landsUnread";
    /** Trackers whose order fails, whatever `order` says. */
    failing: Set<string>;
  };
  earn: {
    available: boolean;
    rate: { apy: number; supplyApy: number; rewardsApy: number } | null;
    deposited: Map<string, number>;
    unreadable: Set<string>;
  };
  /** Once an action has been sent, every balance read fails: it landed, and what it left cannot be read back. */
  unreadAfterAction: boolean;
  calls: { kind: string; amount: number; to?: string; symbol?: string }[];
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
    genesisHash: null,
    beforeSigning: async () => undefined,
    trade: {
      available: true,
      price: 236,
      feeBps: 50,
      holdingOpen: true,
      builds: true,
      heldForMs: 30_000,
      quotes: "priced",
      unpriced: new Set(),
      order: "lands",
      failing: new Set(),
    },
    earn: {
      available: true,
      rate: { apy: 4.16, supplyApy: 3.79, rewardsApy: 0.37 },
      deposited: new Map(),
      unreadable: new Set(),
    },
    unreadAfterAction: false,
    calls: [],
  };
}

const USDC = "USDC";
const UNIT = 1_000_000;
const TRACKER_ACCOUNT_RENT = 2_039_280;
export const FAKE_SIGNATURE = "fake-signature";

function balanceIn(chain: FakeChain, address: string, symbol: string) {
  return chain.balances.get(address)?.[symbol] ?? 0;
}

/** A balance as a chain client reads it, which fails once `unreadAfterAction` applies. */
function readBalance(chain: FakeChain, address: string, symbol: string) {
  if (chain.unreadAfterAction && chain.calls.length > 0) throw new Error("unreadable");
  return balanceIn(chain, address, symbol);
}

function setBalance(chain: FakeChain, address: string, symbol: string, amount: number) {
  chain.balances.set(address, { ...chain.balances.get(address), [symbol]: amount });
}

/** Signs a transaction of `signer`'s through the shared signing guard, as a chain client does. */
export async function signAsAClientWould(
  chain: FakeChain,
  signer: Keypair,
  stillUnlocked: () => boolean,
  transaction = unsignedTransaction(signer),
) {
  await chain.beforeSigning();
  await signAsClient(signer, stillUnlocked, transaction);
}

/** A token's mint account as the chain holds it, for the shared code that sizes a tracker's account from it. */
function mintAccount(address: PublicKey) {
  const stock = ALL_STOCKS.find((entry) => entry.mint.equals(address));
  const data = Buffer.alloc(MintLayout.span);
  MintLayout.encode(
    {
      mintAuthorityOption: 0,
      mintAuthority: PublicKey.default,
      supply: 0n,
      decimals: stock?.decimals ?? 6,
      isInitialized: true,
      freezeAuthorityOption: 0,
      freezeAuthority: PublicKey.default,
    },
    data,
  );
  return { data, owner: stock?.programId ?? TOKEN_PROGRAM_ID, executable: false, lamports: 1 };
}

/** What the shared connection answers, for the reads the shared code makes itself. */
function answerConnection(chain: FakeChain) {
  Object.assign(connection, {
    getGenesisHash: async () => chain.genesisHash ?? expectedGenesisHash(),
    getBlockHeight: async () => (chain.settles === "expired" ? Number.MAX_SAFE_INTEGER : 0),
    isBlockhashValid: async () => ({ value: chain.settles !== "expired" }),
    getSignatureStatus: async () => ({
      value: chain.settles === "landed" ? { confirmationStatus: "confirmed", err: null } : null,
    }),
    getMultipleAccountsInfo: async (accounts: unknown[]) =>
      accounts.map(() => (chain.trade.holdingOpen ? { data: new Uint8Array() } : null)),
    getAccountInfo: async (address: PublicKey) => mintAccount(address),
    getMinimumBalanceForRentExemption: async () => TRACKER_ACCOUNT_RENT,
  });
}

let wired: Money | null = null;

/** The one money wiring of this test file's module registry, made on first use. */
function wiredOnce(): Money {
  wired ??= installMoney(processLocks());
  return wired;
}

export function testMoney(chain: FakeChain): Money {
  const real = wiredOnce();
  answerConnection(chain);

  const quote = async () => {
    if (chain.relayerFeeRaw === null) throw new Error("relayer unavailable");
    return { feeRaw: chain.relayerFeeRaw, opensAccount: chain.opensAccount };
  };

  const relayed = async (
    kind: string,
    amount: number,
    owner: Keypair,
    stillUnlocked: () => boolean,
    move: () => void,
    to?: string,
  ) => {
    chain.calls.push({ kind, amount, to });
    if (chain.relayed === "costRose") throw new ChainError("networkCostRose");
    if (chain.relayed === "relayerUnavailable") throw new ChainError("relayerUnavailable");
    await signAsAClientWould(chain, owner, stillUnlocked);
    if (chain.relayed === "unknown") throw new UnknownOutcomeError(FAKE_SIGNATURE, 100);
    move();
    return FAKE_SIGNATURE;
  };

  const cost: CostChain = {
    balance: async () => 0,
    shortfall: async (_balance, lamports) => ({ required: lamports }),
  };

  const asset: Money["asset"] = (symbol) => ({
    symbol,
    balance: async (owner) => readBalance(chain, owner, symbol),
    ensureAccount: async () => undefined,
    deposit: async () => undefined,
    withdraw: async () => {
      throw new Error("A send on the phone always goes through the relayer.");
    },
    sendRelayed: ({ owner, to, amount, reviewedFeeRaw, stillUnlocked }) =>
      relayed(
        "send",
        amount,
        owner,
        stillUnlocked,
        () => {
          const from = owner.publicKey.toBase58();
          const fee = Number(reviewedFeeRaw) / UNIT;
          setBalance(chain, from, symbol, balanceIn(chain, from, symbol) - amount);
          setBalance(chain, from, USDC, balanceIn(chain, from, USDC) - fee);
        },
        to,
      ),
  });

  const openHolding: Money["tradeChain"]["openHolding"] = async ({
    owner,
    reviewedFeeRaw,
    stillUnlocked,
  }) => {
    if (chain.trade.holdingOpen) return null;
    return relayed("open", 0, owner, stillUnlocked, () => {
      const address = owner.publicKey.toBase58();
      const fee = Number(reviewedFeeRaw) / UNIT;
      setBalance(chain, address, USDC, balanceIn(chain, address, USDC) - fee);
      chain.trade.holdingOpen = true;
    });
  };

  const plan: Money["tradeChain"]["plan"] = async ({ side, symbol, amount }) => {
    const stock = stockBySymbol(symbol);
    if (chain.trade.quotes === "none" || chain.trade.unpriced.has(symbol) || !stock) {
      throw new ChainError("noQuote");
    }
    const { price } = chain.trade;
    const receive = side === "buy" ? amount / price : amount * price;
    const built = chain.trade.holdingOpen && chain.trade.builds;
    const plan: TradePlan = {
      side,
      stock,
      spend: amount,
      receive,
      receiveAtLeast: side === "buy" ? amount / (price + 1) : amount * (price - 1),
      unitPrice: price,
      venue: "Jupiter",
      priceChecked: true,
      quote: {
        inputMint: stock.mint,
        outputMint: stock.mint,
        inAmount: 0n,
        outAmount: 0n,
        minOutAmount: 0n,
        slippageBps: 50,
        priceImpactPct: 0,
        venue: "Jupiter",
        expiresAt: Date.now() + chain.trade.heldForMs,
        feeBps: chain.trade.feeBps,
        gasless: true,
        takerPaysRent: !chain.trade.holdingOpen,
        raw: { built },
      },
    };
    return plan;
  };

  const tradeChain: Money["tradeChain"] = {
    ...real.tradeChain,
    available: () => chain.trade.available,
    plan,
    isBuilt: (order) => (order.quote.raw as { built: boolean }).built,
    async execute(owner, order, stillUnlocked) {
      const { symbol } = order.stock;
      chain.calls.push({ kind: order.side, amount: order.spend, symbol });
      if (chain.trade.order === "fails" || chain.trade.failing.has(symbol)) {
        throw new Error("The order could not be placed.");
      }
      await signAsAClientWould(chain, owner, stillUnlocked);
      if (chain.trade.order === "unknown") throw new UnknownOutcomeError(FAKE_SIGNATURE, 100);
      const address = owner.publicKey.toBase58();
      const sign = order.side === "buy" ? 1 : -1;
      const tokens = order.side === "buy" ? order.receive : order.spend;
      const dollars = order.side === "buy" ? order.spend : order.receive;
      setBalance(chain, address, symbol, balanceIn(chain, address, symbol) + sign * tokens);
      setBalance(chain, address, USDC, balanceIn(chain, address, USDC) - sign * dollars);
      return FAKE_SIGNATURE;
    },
    gaslessFromUsd: 12,
    cashSymbol: USDC,
    holdingOpen: async () => chain.trade.holdingOpen,
    quoteOpenHolding: async () => ({ ...(await quote()), opensAccount: true }),
    openHolding,
    async tradeBalances(owner, stock) {
      if (chain.trade.order === "landsUnread") throw new Error("unreadable");
      return [balanceIn(chain, owner, stock.symbol), balanceIn(chain, owner, USDC)];
    },
    async balanceOf(address, symbol) {
      if (chain.trade.order === "landsUnread") throw new Error("unreadable");
      return balanceIn(chain, address, symbol);
    },
    cost,
  };

  return {
    ...real,
    refresh: fakeRefresh(real, chain),
    asset,
    privateToken: (symbol) =>
      symbol !== USDC
        ? undefined
        : {
            symbol,
            balance: async (owner) => balanceIn(chain, owner, USDC),
            async sendPrivately({ sender, to, amount, stillUnlocked }) {
              chain.calls.push({ kind: "private", amount, to });
              if (chain.privateTransfer === "refused") {
                throw new Error(
                  "This transfer would name one of your portfolios on chain next to your funding wallet. Not signed.",
                );
              }
              await signAsAClientWould(chain, sender, stillUnlocked);
              if (chain.privateTransfer === "unknown") throw new UnknownOutcomeError();
              const from = sender.publicKey.toBase58();
              const fee = Math.ceil(amount * 10) / 10_000 + 0.2;
              setBalance(chain, from, USDC, balanceIn(chain, from, USDC) - amount - fee);
              if (chain.privateTransfer === "lands") {
                setBalance(chain, to, USDC, balanceIn(chain, to, USDC) + amount);
              }
              return { signature: FAKE_SIGNATURE, feeTokens: Math.round(fee * UNIT) / UNIT };
            },
            nudgeSettlement: async () => undefined,
          },
    sendChain: {
      asset,
      token: (symbol) => ({
        symbol,
        decimals: 6,
        sendLamports: async () => 5_000,
        quoteRelayed: quote,
      }),
      isRecipientAddress,
      checkRecipient: async () => chain.recipient,
      cashSymbol: USDC,
      networkFeeSol: 0.000005,
      cost,
    },
    tradeChain,
    holdingsChain: { stock: stockBySymbol, openHolding },
    earnChain: {
      available: () => chain.earn.available,
      move: async () => {
        throw new Error("Earn on the phone always goes through the relayer.");
      },
      moveRelayed: ({ action, owner, amount, reviewedFeeRaw, stillUnlocked }) =>
        relayed(action, amount, owner, stillUnlocked, () => {
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
    },
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
    cashSymbol: USDC,
  };
}

/** The shared balance refresh, reading the fake chain's map in place of the network. */
function fakeRefresh(real: Money, chain: FakeChain) {
  const { store, prices, track } = real.deps;
  return createBalanceRefresh({
    store,
    chain: {
      balanceOf: async (address, symbol) => readBalance(chain, address, symbol),
      async portfolioBalances(address) {
        readBalance(chain, address, USDC);
        const { USDC: cash = 0, ...trackers } = chain.balances.get(address) ?? {};
        return { cash: { SOL: 0, USDC: cash }, trackers };
      },
      cashBalances: async (address) => ({ SOL: 0, USDC: balanceIn(chain, address, USDC) }),
    },
    prices,
    track,
    shuffle: (items) => items,
  });
}

export const PHONE_METRICS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, right: 0, bottom: 34, left: 0 },
};

/** A screen with its services, its money clients and a phone's safe area. */
export function renderWithMoney(services: AppServices, money: Money, ui: ReactElement) {
  return renderWith(
    services,
    <SafeAreaProvider initialMetrics={PHONE_METRICS}>
      <MoneyProvider money={money}>{ui}</MoneyProvider>
    </SafeAreaProvider>,
  );
}

export type PortfolioSpec = {
  label: string;
  cash?: number;
  /** Tracker tokens held, by symbol. */
  holdings?: Record<string, number>;
  pie?: PieSlice[];
  pendingAction?: PendingAction;
};

type Setup = {
  /** The funding wallet's USDC. */
  funding?: number;
  /** The first is the one a created wallet comes with. */
  portfolios?: PortfolioSpec[];
  /** False leaves the balances never read, as before Home's first refresh answers. */
  balancesRead?: boolean;
};

/** A stored, unlocked wallet with these portfolios; answers their ids, in order. */
export async function portfoliosWith(portfolios: PortfolioSpec[]): Promise<string[]> {
  const wallet = await walletWith(fakeChain(), { portfolios });
  return wallet.portfolios.map((portfolio) => portfolio.id);
}

/**
 * An unlocked wallet with the given balances, stored in the shared store and
 * mirrored into `chain`, so a refresh reads back what the wallet shows. Its
 * balances count as read once, as they are after Home's first refresh.
 */
export async function walletWith(chain: FakeChain, setup: Setup = {}): Promise<Wallet> {
  const {
    funding = 500,
    portfolios = [{ label: "Investing", cash: 457.33 }],
    balancesRead = true,
  } = setup;
  const draft = createWallet();
  const mnemonic = draft.phrase.join(" ");
  const [first] = draft.wallet.portfolios;
  const extra: Portfolio[] = portfolios.slice(1).map((entry, index) => {
    const derivationIndex = first.derivationIndex + index + 1;
    const key = deriveKeypair(mnemonic, derivationIndex, draft.wallet.derivationScheme);
    return createPortfolio(entry.label, key.publicKey.toBase58(), derivationIndex);
  });
  const all = [first, ...extra].slice(0, portfolios.length).map((portfolio, index) => {
    const spec = portfolios[index];
    const cash = spec.cash ?? 0;
    const trackers: Holding[] = Object.entries(spec.holdings ?? {}).map(([symbol, amount]) => ({
      symbol,
      amount,
      cost: 0,
    }));
    setBalance(chain, portfolio.address, USDC, cash);
    for (const holding of trackers) {
      setBalance(chain, portfolio.address, holding.symbol, holding.amount);
    }
    return {
      ...portfolio,
      label: spec.label,
      holdings: [
        ...portfolio.holdings.map((holding) =>
          holding.symbol === USDC ? { ...holding, amount: cash, cost: cash } : holding,
        ),
        ...trackers,
      ],
      ...(spec.pie ? { pie: spec.pie } : {}),
      ...(spec.pendingAction ? { pendingAction: spec.pendingAction } : {}),
    };
  });
  const wallet: Wallet = {
    ...draft.wallet,
    funding: { ...draft.wallet.funding, tokens: { ...draft.wallet.funding.tokens, USDC: funding } },
    portfolios: all,
  };
  setBalance(chain, wallet.funding.address, USDC, funding);
  await storeNewWallet(wallet, draft.phrase, STRONG_PASSWORD);
  if (balancesRead) recordBalanceRead(true);
  return getSnapshot() ?? wallet;
}
