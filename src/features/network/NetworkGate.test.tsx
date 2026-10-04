import { STILL_WORKING_AFTER_MS, WAITING_DELAY_MS } from "@noirwire/shared/presentation";
import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text, WAITING_LIMIT_MS } from "@/ui";
import { renderWith, testServices } from "../testServices";
import { checkNetwork } from "./gateCheck";
import { NetworkGate } from "./NetworkGate";
import { OfflineBanner } from "./OfflineBanner";

const MAINNET = "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d";
const DEVNET = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";
const network = () => "Solana mainnet";

describe("checkNetwork", () => {
  it("passes only the chain whose genesis hash is the expected one", async () => {
    expect(await checkNetwork(async () => MAINNET, MAINNET)).toBe("ok");
    expect(await checkNetwork(async () => DEVNET, MAINNET)).toBe("wrongNetwork");
    expect(await checkNetwork(() => Promise.reject(new Error("offline")), MAINNET)).toBe(
      "unreachable",
    );
  });
});

describe("NetworkGate", () => {
  it("opens the app once the network is the expected one", async () => {
    await render(
      <NetworkGate check={async () => "ok"} network={network}>
        <Text>The wallet</Text>
      </NetworkGate>,
    );
    expect(await screen.findByText("The wallet")).toBeOnTheScreen();
  });

  it("refuses to run against another network, with no way past it", async () => {
    await render(
      <NetworkGate check={() => checkNetwork(async () => DEVNET, MAINNET)} network={network}>
        <Text>The wallet</Text>
      </NetworkGate>,
    );
    expect(
      await screen.findByText(
        "NoirWire is not connected to Solana mainnet as it should be. Your money has not moved, and nothing can be sent until this is fixed. Try again later.",
      ),
    ).toBeOnTheScreen();
    expect(screen.queryByText("The wallet")).toBeNull();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("offers to try again when the network cannot be reached, and opens on a pass", async () => {
    const check = jest
      .fn<Promise<"ok" | "unreachable">, []>()
      .mockResolvedValueOnce("unreachable")
      .mockResolvedValueOnce("ok");
    await render(
      <NetworkGate check={check} network={network}>
        <Text>The wallet</Text>
      </NetworkGate>,
    );
    expect(
      await screen.findByText(
        "We can't show your balances right now. Your money has not moved. Try again.",
      ),
    ).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("The wallet")).toBeOnTheScreen();
    expect(check).toHaveBeenCalledTimes(2);
  });

  it("stays quiet for a moment, then says it is checking", async () => {
    jest.useFakeTimers();
    try {
      await render(
        <NetworkGate check={() => new Promise(() => undefined)} network={network}>
          <Text>The wallet</Text>
        </NetworkGate>,
      );
      expect(screen.queryByText("Getting things ready...")).toBeNull();
      await act(() => jest.advanceTimersByTimeAsync(WAITING_DELAY_MS));
      expect(screen.getByText("Getting things ready...")).toBeOnTheScreen();
      expect(screen.queryByText("The wallet")).toBeNull();
      await act(() => jest.advanceTimersByTimeAsync(STILL_WORKING_AFTER_MS.check));
      expect(
        screen.getByText("Still checking. This is taking longer than usual."),
      ).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });

  it("never waits for ever: a check that does not answer ends with Try again", async () => {
    jest.useFakeTimers();
    try {
      const check = jest
        .fn<Promise<"ok">, []>()
        .mockReturnValueOnce(new Promise(() => undefined))
        .mockResolvedValueOnce("ok");
      await render(
        <NetworkGate check={check} network={network}>
          <Text>The wallet</Text>
        </NetworkGate>,
      );
      await act(() => jest.advanceTimersByTimeAsync(WAITING_LIMIT_MS.check));
      expect(
        screen.getByText(
          "We can't show your balances right now. Your money has not moved. Try again.",
        ),
      ).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole("button", { name: "Try again" }));
      await act(() => jest.advanceTimersByTimeAsync(0));
      expect(screen.getByText("The wallet")).toBeOnTheScreen();
    } finally {
      jest.useRealTimers();
    }
  });
});

describe("OfflineBanner", () => {
  const metrics = {
    frame: { x: 0, y: 0, width: 390, height: 844 },
    insets: { top: 47, right: 0, bottom: 34, left: 0 },
  };
  const OFFLINE =
    "You're offline. Balances and prices may be out of date, and nothing can be sent until you're back online.";

  it.each([
    [false, true],
    [true, false],
  ])("while online is %s, shows the banner: %s", async (online, shown) => {
    await renderWith(
      await testServices({ useOnline: () => online }),
      <SafeAreaProvider initialMetrics={metrics}>
        <OfflineBanner pinned />
      </SafeAreaProvider>,
    );
    expect(screen.queryByText(OFFLINE) !== null).toBe(shown);
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("takes its own place under the status bar instead of lying over the screen", async () => {
    const view = await renderWith(
      await testServices({ useOnline: () => false }),
      <SafeAreaProvider initialMetrics={metrics}>
        <OfflineBanner pinned />
      </SafeAreaProvider>,
    );
    const positions = JSON.stringify(view.toJSON());
    expect(positions).not.toContain('"position":"absolute"');
    expect(positions).toContain('"paddingTop":51');
  });
});
