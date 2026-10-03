import type { BrowserContext, Route } from "@playwright/test";
import {
  ACCOUNT_SIZE,
  AccountLayout,
  getAssociatedTokenAddressSync,
  MINT_SIZE,
  MintLayout,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { ALL_STOCKS, LEND_RECEIPT_MINT } from "@noirwire/shared/infrastructure";
import { Keypair, PublicKey } from "@solana/web3.js";
import earnTokens from "../fixtures/earn-tokens.json";
import history from "../fixtures/history.json";
import prices from "../fixtures/prices.json";

/** The relay origin the export is built against. Every request to it is answered here. */
export const RELAY_ORIGIN = "https://app.noirwire.com";

const USDC_MINT = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const MAINNET_GENESIS = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const RENT_EXEMPT_TOKEN_ACCOUNT = 2039280;
/** The relayer's price for a transfer, in raw USDC: 0.012 USDC, under the app's cap. */
const RELAYER_FEE_RAW = 12_000;

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
};

type RpcCall = { jsonrpc: "2.0"; id: unknown; method: string; params?: unknown[] };
type AccountValue = {
  data: [string, "base64"];
  executable: boolean;
  lamports: number;
  owner: string;
  rentEpoch: number;
  space: number;
};

/** A token account of `owner`'s holding `amount` of a six-decimal `mint`. */
function tokenAccountData(mint: PublicKey, owner: PublicKey, amount: number): Buffer {
  const data = Buffer.alloc(ACCOUNT_SIZE);
  AccountLayout.encode(
    {
      mint,
      owner,
      amount: BigInt(Math.round(amount * 1e6)),
      delegateOption: 0,
      delegate: PublicKey.default,
      state: 1,
      isNativeOption: 0,
      isNative: 0n,
      delegatedAmount: 0n,
      closeAuthorityOption: 0,
      closeAuthority: PublicKey.default,
    },
    data,
  );
  return data;
}

function mintData(decimals: number): Buffer {
  const data = Buffer.alloc(MINT_SIZE);
  MintLayout.encode(
    {
      mintAuthorityOption: 0,
      mintAuthority: PublicKey.default,
      supply: 10n ** 15n,
      decimals,
      isInitialized: true,
      freezeAuthorityOption: 0,
      freezeAuthority: PublicKey.default,
    },
    data,
  );
  return data;
}

function parseBody(text: string | null) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
}

type Stored = { data: Buffer; program: PublicKey };

function accountValue({ data, program }: Stored): AccountValue {
  return {
    data: [data.toString("base64"), "base64"],
    executable: false,
    lamports: RENT_EXEMPT_TOKEN_ACCOUNT,
    owner: program.toBase58(),
    rentEpoch: 0,
    space: data.length,
  };
}

/**
 * A stand-in for the NoirWire relay: Solana RPC, prices, history, the fee
 * relayer and the Earn vaults, all answered from committed fixtures. Any
 * other host is refused and recorded, so a test fails if the app reaches
 * for the internet.
 */
export class FixtureRelay {
  // USDC, and every tracker's Token-2022 mint with no multiplier scheduled.
  private readonly accounts = new Map<string, Stored>([
    [USDC_MINT.toBase58(), { data: mintData(6), program: TOKEN_PROGRAM_ID }],
    ...ALL_STOCKS.map(
      (stock) =>
        [
          stock.mint.toBase58(),
          { data: mintData(stock.decimals), program: TOKEN_2022_PROGRAM_ID },
        ] as const,
    ),
  ]);
  private readonly feePayer = Keypair.generate().publicKey.toBase58();
  private readonly paymentWallet = Keypair.generate().publicKey.toBase58();
  private readonly blockhash = Keypair.generate().publicKey.toBase58();

  /** Requests to hosts other than the app and the relay, which were refused. */
  readonly outsiders: string[] = [];
  /** Relay routes the fixtures do not cover, answered with 503. */
  readonly unanswered: string[] = [];

  constructor(private readonly appOrigin: string) {}

  /** Gives `owner` a USDC token account holding `usdc`. */
  holdUsdc(owner: string, usdc: number): void {
    this.hold(USDC_MINT, owner, usdc);
  }

  /** Lends `usdc` of `owner`'s through Earn: the vault's receipt token, which the fixture vault redeems one for one. */
  holdEarn(owner: string, usdc: number): void {
    this.hold(LEND_RECEIPT_MINT, owner, usdc);
  }

  private hold(mint: PublicKey, owner: string, amount: number): void {
    const wallet = new PublicKey(owner);
    const account = getAssociatedTokenAddressSync(mint, wallet, true);
    this.accounts.set(account.toBase58(), {
      data: tokenAccountData(mint, wallet, amount),
      program: TOKEN_PROGRAM_ID,
    });
  }

  async install(context: BrowserContext): Promise<void> {
    await context.route(
      (url) => url.origin !== this.appOrigin && url.origin !== RELAY_ORIGIN,
      (route) => {
        this.outsiders.push(route.request().url());
        return route.abort("blockedbyclient");
      },
    );
    await context.route(`${RELAY_ORIGIN}/**`, (route) => this.answer(route));
  }

  private account(key: unknown): AccountValue | null {
    const stored = typeof key === "string" ? this.accounts.get(key) : undefined;
    return stored ? accountValue(stored) : null;
  }

  private rpc(call: RpcCall) {
    const context = { slot: 1 };
    const params = call.params ?? [];
    const result = (() => {
      switch (call.method) {
        case "getGenesisHash":
          return MAINNET_GENESIS;
        case "getAccountInfo":
          return { context, value: this.account(params[0]) };
        case "getMultipleAccounts":
          return { context, value: (params[0] as unknown[]).map((key) => this.account(key)) };
        case "getBalance":
          return { context, value: 0 };
        case "getTokenAccountsByOwner":
          return { context, value: [] };
        case "getSignaturesForAddress":
          return [];
        case "getMinimumBalanceForRentExemption":
          return RENT_EXEMPT_TOKEN_ACCOUNT;
        case "getLatestBlockhash":
          return { context, value: { blockhash: this.blockhash, lastValidBlockHeight: 1000 } };
        case "getSlot":
        case "getBlockHeight":
          return 1;
        case "getSignatureStatuses":
          return { context, value: (params[0] as unknown[]).map(() => null) };
        default:
          return null;
      }
    })();
    return { jsonrpc: "2.0", id: call.id, result };
  }

  private relayer(method: string, body: { method?: string }) {
    if (method === "GET") {
      return {
        available: true,
        feePayers: [this.feePayer],
        paymentWallet: this.paymentWallet,
        accountCreation: true,
      };
    }
    if (body.method === "getPayerSigner") {
      return { result: { signer_address: this.feePayer, payment_address: this.paymentWallet } };
    }
    if (body.method === "estimateTransactionFee")
      return { result: { fee_in_token: RELAYER_FEE_RAW } };
    return null;
  }

  /**
   * A price-only Jupiter order at the fixture price, paid for by the venue,
   * with no transaction: enough to review a trade, never enough to sign one.
   */
  private order(request: { inputMint: string; outputMint: string; amount: string }) {
    const usdPer = (mint: string) => {
      if (mint === USDC_MINT.toBase58()) return { usd: 1, decimals: 6 };
      const stock = ALL_STOCKS.find((candidate) => candidate.mint.toBase58() === mint);
      const quoted = stock && (prices.prices as Record<string, { usd: number }>)[stock.symbol];
      return { usd: quoted ? quoted.usd : 1, decimals: stock?.decimals ?? 6 };
    };
    const from = usdPer(request.inputMint);
    const to = usdPer(request.outputMint);
    const inAmount = BigInt(request.amount);
    const dollars = (Number(inAmount) / 10 ** from.decimals) * from.usd;
    const outAmount = BigInt(Math.floor((dollars / to.usd) * 10 ** to.decimals));
    return {
      inputMint: request.inputMint,
      outputMint: request.outputMint,
      inAmount: inAmount.toString(),
      outAmount: outAmount.toString(),
      otherAmountThreshold: ((outAmount * 995n) / 1000n).toString(),
      slippageBps: 50,
      priceImpactPct: "0.0004",
      swapType: "aggregator",
      gasless: true,
      feeBps: 2,
      expireAt: String(Math.floor(Date.now() / 1000) + 300),
      transaction: null,
    };
  }

  private answer(route: Route) {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const json = (value: unknown, status = 200) =>
      route.fulfill({
        status,
        headers: CORS,
        contentType: "application/json",
        body: JSON.stringify(value),
      });
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });

    const body = parseBody(request.postData());
    if (pathname === "/api/rpc") {
      return json(Array.isArray(body) ? body.map((call) => this.rpc(call)) : this.rpc(body));
    }
    if (pathname === "/api/prices") return json(prices);
    if (pathname.startsWith("/api/history/")) return json(history);
    if (pathname === "/api/event") return route.fulfill({ status: 204, headers: CORS });
    if (pathname === "/api/jupiter/lend/v1/earn/tokens") return json(earnTokens);
    if (pathname === "/api/jupiter/lend/v1/earn/earnings") return json([{ earnings: "0" }]);
    if (pathname === "/api/jupiter/swap/v2/order" && body) return json(this.order(body));
    if (pathname === "/api/relayer") {
      const reply = this.relayer(request.method(), body ?? {});
      if (reply) return json(reply);
    }
    this.unanswered.push(`${request.method()} ${pathname}`);
    return json({ error: "Not covered by the test fixtures." }, 503);
  }
}
