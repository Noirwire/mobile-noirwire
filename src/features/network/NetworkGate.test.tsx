import { act, fireEvent, render, screen } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Text } from "@/ui";
import { renderWith, testServices } from "../testServices";
import { checkNetwork, QUIET_CHECK_MS } from "./gateCheck";
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
        "This app is built for Solana mainnet, but its network connection serves a different chain. Nothing can be sent until that is fixed.",
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
        "The network could not be reached, so balances cannot be shown safely.",
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
      expect(screen.queryByText("Checking the network...")).toBeNull();
      await act(async () => {
        jest.advanceTimersByTime(QUIET_CHECK_MS);
      });
      expect(screen.getByText("Checking the network...")).toBeOnTheScreen();
      expect(screen.queryByText("The wallet")).toBeNull();
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
});
