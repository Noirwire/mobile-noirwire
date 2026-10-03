import { forgetWallet, installTestPlatform } from "../testServices";
import { unlockedWallet } from "../portfolio/testWallet";
import { addressGroups, addressLines, spokenAddress } from "./addressGroups";
import { receiveTarget } from "./receiveTarget";
import { receiveView } from "./receiveView";

afterEach(() => forgetWallet());

describe("receiveView", () => {
  it("shows the funding address masked unless asked to show it, with its one warning", async () => {
    installTestPlatform();
    const wallet = await unlockedWallet();
    const masked = receiveView(wallet, { kind: "funding", reveal: false }, "devnet");
    expect(masked).toMatchObject({
      kind: "address",
      title: "Your funding address",
      notice: "This first transfer is public and may link the sending address to you.",
      masked: { text: "Your funding address is hidden.", show: "Show address" },
      address: wallet.funding.address,
      qrLabel: "QR code of your funding address",
      notes: [
        "Only send USDC on Solana. Other assets or networks may be lost.",
        "Once it arrives, move it into a portfolio through the private route.",
      ],
      what: "funding",
    });
    expect(receiveView(wallet, { kind: "funding", reveal: true }, "devnet")).toMatchObject({
      masked: null,
    });
  });

  it("shows a portfolio's own address at once, and never the funding one beside it", async () => {
    installTestPlatform();
    const wallet = await unlockedWallet((w) => ({
      ...w,
      portfolios: w.portfolios.map((p) => ({ ...p, label: "Investing" })),
    }));
    const [portfolio] = wallet.portfolios;
    const view = receiveView(wallet, { kind: "portfolio", id: portfolio.id }, "mainnet-beta");
    expect(view).toMatchObject({
      title: "Receive in Investing",
      masked: null,
      address: portfolio.address,
      qrLabel: "QR code of Investing's address",
      notes: [
        "Investing's own address on Solana, derived from your recovery phrase. Only send Solana assets to it. Funds sent from another network are lost.",
      ],
    });
    expect(JSON.stringify(view)).not.toContain(wallet.funding.address);
  });

  it("refuses a missing or archived portfolio", async () => {
    installTestPlatform();
    const wallet = await unlockedWallet((w) => ({
      ...w,
      portfolios: w.portfolios.map((p) => ({ ...p, archivedAt: 1 })),
    }));
    expect(receiveView(wallet, { kind: "portfolio", id: "gone" }, "devnet").kind).toBe(
      "unavailable",
    );
    expect(
      receiveView(wallet, { kind: "portfolio", id: wallet.portfolios[0].id }, "devnet"),
    ).toMatchObject({
      kind: "unavailable",
      message: "This portfolio is archived. Restore it before receiving into it.",
    });
  });
});

describe("receiveTarget", () => {
  it("reads the funding wallet, a portfolio id, and refuses anything shaped like an address", () => {
    expect(receiveTarget(undefined, undefined)).toEqual({ kind: "funding", reveal: false });
    expect(receiveTarget("funding", "1")).toEqual({ kind: "funding", reveal: true });
    expect(receiveTarget("acc_123", undefined)).toEqual({ kind: "portfolio", id: "acc_123" });
    expect(receiveTarget("7xKp4tRmQ9wZ2b8nV3cL5dF6gH1jK2mN3pQ4rS5tU6v", "1")).toEqual({
      kind: "funding",
      reveal: false,
    });
  });
});

describe("addressGroups", () => {
  const address = "7xKp4tRmQ9wZ2b8nV3cL5dF6gH1jK2mN3pQ4rS5tU6v";

  it("cuts an address into groups of four over two lines", () => {
    expect(addressGroups("abcdefghij")).toEqual(["abcd", "efgh", "ij"]);
    expect(addressLines(address)).toEqual([
      "7xKp 4tRm Q9wZ 2b8n V3cL 5dF6",
      "gH1j K2mN 3pQ4 rS5t U6v",
    ]);
  });

  it("is read out one group of four at a time", () => {
    expect(spokenAddress("abcdefgh")).toBe("a b c d, e f g h");
  });
});
