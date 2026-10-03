import {
  createBalanceRefresh,
  createPendingActions,
  type CostChain,
  type EarnChain,
  type SendableAsset,
  type SendChain,
} from "@noirwire/shared/application";
import { failureReason } from "@noirwire/shared/domain";
import {
  EARN_FIRST_DEPOSIT_LAMPORTS,
  EARN_NETWORK_FEE_LAMPORTS,
  NETWORK_FEE_LAMPORTS,
  QUOTE_TOKEN,
  assetHandle,
  connection,
  getCashBalances,
  getPortfolioBalances,
  getTokenBalance,
  isMainnet,
  isRecipientAddress,
  jupiterLend,
  lamportsToSol,
  nudgeSettlement,
  quoteRelayed,
  recordSignedWith,
  relayedEarnDraft,
  relayedSendDraft,
  runRelayed,
  sendPrivateTransfer,
  settle,
  shortfallFor,
  shuffled,
  tokenBySymbol,
  tokenSendLamports,
} from "@noirwire/shared/infrastructure";
import { getPlatform } from "@noirwire/shared/platform";
import { failureMessage, pendingWords } from "@noirwire/shared/presentation";
import {
  catalog,
  getSnapshot,
  isUnlocked,
  serialised,
  subscribe,
  syncFromStorage,
  unlockedSession,
  updateWallet,
} from "@noirwire/shared/wallet";
import { PublicKey, type Keypair } from "@solana/web3.js";
import { unsendable } from "../send/recipientCheck";
import type { Money } from "./money";
import { processLocks } from "./processLocks";

const address = (value: string) => new PublicKey(value);

const store = { snapshot: getSnapshot, update: updateWallet, isUnlocked, serialised };

/** Asked for at the moment of each event, so the platform installed at boot is the one counted with. */
const track: Money["deps"]["track"] = (name, data) =>
  (getPlatform().track as (name: string, data?: object) => void)(name, data);

async function balanceOf(owner: string, symbol: string): Promise<number> {
  const handle = assetHandle(symbol);
  if (!handle) throw new Error(`Unknown asset: ${symbol}.`);
  return handle.getBalance(address(owner));
}

const cost: CostChain = {
  balance: (owner) => connection.getBalance(address(owner)),
  shortfall: shortfallFor,
};

function sendable(symbol: string): SendableAsset<Keypair> | undefined {
  const handle = assetHandle(symbol);
  if (!handle) return undefined;
  const token = tokenBySymbol(handle.symbol);
  return {
    symbol: handle.symbol,
    balance: (owner) => handle.getBalance(address(owner)),
    ensureAccount: handle.ensureAccount,
    deposit: handle.deposit,
    withdraw: (owner, funder, amount, to, stillUnlocked) =>
      handle.withdraw(owner, funder, amount, address(to), stillUnlocked),
    ...(token && {
      sendRelayed: ({ owner, to, amount, reviewedFeeRaw, keepOut, stillUnlocked }) =>
        runRelayed({
          owner,
          reviewedFeeRaw,
          keepOut: keepOut.map(address),
          stillUnlocked,
          build: (terms) =>
            relayedSendDraft({ ...token, owner: owner.publicKey, to: address(to), amount }, terms),
        }),
    }),
  };
}

const sendChain: SendChain<Keypair> = {
  asset: sendable,
  token(symbol) {
    const token = tokenBySymbol(symbol);
    if (!token) return undefined;
    return {
      symbol: token.symbol,
      decimals: token.decimals,
      sendLamports: (to) => tokenSendLamports(token.mint, address(to), token.programId),
      quoteRelayed: (owner, to, amount) =>
        quoteRelayed(address(owner), (terms) =>
          relayedSendDraft({ ...token, owner: address(owner), to: address(to), amount }, terms),
        ),
    };
  },
  isRecipientAddress,
  cashSymbol: QUOTE_TOKEN.symbol,
  networkFeeSol: lamportsToSol(NETWORK_FEE_LAMPORTS),
  cost,
};

const earnChain: EarnChain<Keypair> = {
  available: isMainnet,
  move: (action, owner, amount, stillUnlocked) =>
    action === "deposit"
      ? jupiterLend.deposit(owner, amount, stillUnlocked)
      : jupiterLend.withdraw(owner, amount, stillUnlocked),
  moveRelayed: ({ action, owner, amount, reviewedFeeRaw, keepOut, stillUnlocked }) =>
    runRelayed({
      owner,
      reviewedFeeRaw,
      keepOut: keepOut.map(address),
      stillUnlocked,
      build: (terms) => relayedEarnDraft(action, owner.publicKey, amount, terms),
    }),
  quoteRelayed: (action, owner, amount) =>
    quoteRelayed(address(owner), (terms) =>
      relayedEarnDraft(action, address(owner), amount, terms),
    ),
  cashSymbol: QUOTE_TOKEN.symbol,
  cost,
};

function build(): Money {
  const pending = createPendingActions({
    store: {
      snapshot: getSnapshot,
      update: updateWallet,
      sync: syncFromStorage,
      serialised,
      subscribe,
    },
    locks: processLocks(),
    settle,
    prices: catalog,
  });
  recordSignedWith((record) =>
    pending.recordSigned({ ...record, signer: record.signer.toBase58() }),
  );

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
        balanceOf,
        portfolioBalances: (owner) => getPortfolioBalances(address(owner)),
        cashBalances: (owner) => getCashBalances(address(owner)),
      },
      prices: catalog,
      track,
      shuffle: shuffled,
    }),
    privateToken(symbol) {
      const token = tokenBySymbol(symbol);
      if (!token) return undefined;
      return {
        symbol: token.symbol,
        balance: (owner) => getTokenBalance(token.mint, token.decimals, address(owner)),
        sendPrivately: ({ sender, to, amount, keepOut, stillUnlocked }) =>
          sendPrivateTransfer({
            sender,
            to: address(to),
            mint: token.mint,
            decimals: token.decimals,
            amount,
            keepOut: keepOut.map(address),
            stillUnlocked,
          }),
        nudgeSettlement: () => nudgeSettlement(token.mint),
      };
    },
    sendChain,
    earnChain,
    earnVenue: {
      name: jupiterLend.name,
      rate: () => jupiterLend.rate(),
      position: (owner) => jupiterLend.position(address(owner)),
      lamportsNeeded: (position) =>
        EARN_NETWORK_FEE_LAMPORTS + (position.hasReceiptAccount ? 0 : EARN_FIRST_DEPOSIT_LAMPORTS),
    },
    async checkRecipient(to) {
      const account = await connection.getAccountInfo(address(to));
      return unsendable(
        to,
        account && {
          executable: account.executable,
          owner: account.owner.toBase58(),
          data: account.data,
        },
      );
    },
    pending,
    cashSymbol: QUOTE_TOKEN.symbol,
  };
}

let device: Money | null = null;

/** The device's money services, made once, on first use, after the platform is installed. */
export function deviceMoney(): Money {
  device ??= build();
  return device;
}
